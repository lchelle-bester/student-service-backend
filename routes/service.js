// Updated service routes with organization-specific hour limits
const router = require("express").Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/auth");

// Helper function to get organization's hour limit
const getOrganizationHourLimit = async (organizationId) => {
  try {
    const result = await db.query(
      "SELECT org_key FROM organizations WHERE id = $1",
      [organizationId]
    );
    
    if (result.rows.length > 0 && result.rows[0].org_key === 'HEO77') {
      return 50; // Special limit for HEO77
    }
    return 10; // Default limit for all other organizations
  } catch (error) {
    console.error('Error getting organization hour limit:', error);
    return 10; // Default to standard limit on error
  }
};

// Updated validation function with dynamic hour limit
const validateServiceHours = async (
  hours,
  dateCompleted,
  studentName,
  description,
  organizationId = null
) => {
  const errors = [];

  if (!hours || !dateCompleted || !studentName || !description) {
    errors.push("All fields are required");
  }

  const selectedDate = new Date(dateCompleted);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate > today) {
    errors.push("Service date cannot be in the future");
  }

  const hoursNum = parseFloat(hours);
  console.log("Validating hours:", { original: hours, parsed: hoursNum });

  // Get the appropriate hour limit for this organization
  const maxHours = organizationId ? await getOrganizationHourLimit(organizationId) : 10;

  if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > maxHours) {
    errors.push(`Hours must be between 0.5 and ${maxHours}`);
  }

  if (Math.round(hoursNum * 10) % 5 !== 0) {
    errors.push("Hours must be in half hour increments (0.5)");
  }

  if (description.length < 8) {
    errors.push("Description must be at least 8 characters long");
  }

  return errors;
};

// Batch logging for organizations (community service) - UPDATED
router.post(
  "/batch-log-community",
  authMiddleware.verifyToken,
  async (req, res) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const {
        students, // Array of student objects [{firstName, surname, hours}, ...]
        dateCompleted,
        description,
      } = req.body;

      const organizationId = req.user.id;

      // Get the hour limit for this organization
      const maxHours = await getOrganizationHourLimit(organizationId);

      // Validate common fields
      if (
        !dateCompleted ||
        !description ||
        !students ||
        students.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      if (description.length < 8 || description.length > 200) {
        return res.status(400).json({
          success: false,
          message: "Description must be between 8 and 200 characters",
        });
      }

      const results = [];
      const errors = [];

      // Process each student
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const { firstName, surname, hours } = student;

        try {
          // Validate student data with organization-specific limits
          const hoursFloat = parseFloat(hours);
          if (isNaN(hoursFloat) || hoursFloat < 0.5 || hoursFloat > maxHours) {
            errors.push(`Student ${i + 1}: Hours must be between 0.5 and ${maxHours}`);
            continue;
          }

          if ((hoursFloat * 10) % 5 !== 0) {
            errors.push(
              `Student ${i + 1}: Hours must be in half hour increments`
            );
            continue;
          }

          if (!firstName || firstName.trim().length <= 1) {
            errors.push(
              `Student ${i + 1}: First name must be longer than 1 character`
            );
            continue;
          }

          if (!surname || surname.trim().length <= 1) {
            errors.push(
              `Student ${i + 1}: Surname must be longer than 1 character`
            );
            continue;
          }

          const fullName = `${firstName.trim()} ${surname.trim()}`;

          // Find student in database
          const studentResult = await client.query(
            "SELECT id FROM users WHERE LOWER(full_name) = LOWER($1) AND user_type = $2",
            [fullName, "student"]
          );

          if (studentResult.rows.length === 0) {
            errors.push(`Student ${i + 1}: ${fullName} not found in database`);
            continue;
          }

          // Insert service record
          const insertResult = await client.query(
            `INSERT INTO service_records (
                        user_id,
                        hours,
                        service_type,
                        description,
                        date_completed,
                        organization_id
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id, hours`,
            [
              studentResult.rows[0].id,
              hoursFloat,
              "community",
              description,
              dateCompleted,
              organizationId,
            ]
          );

          // Update student's total hours
          await client.query(
            "UPDATE users SET total_hours = total_hours + $1 WHERE id = $2",
            [hoursFloat, studentResult.rows[0].id]
          );

          results.push({
            studentName: fullName,
            hours: hoursFloat,
            recordId: insertResult.rows[0].id,
            success: true,
          });
        } catch (studentError) {
          console.error(`Error processing student ${i + 1}:`, studentError);
          errors.push(`Student ${i + 1}: ${studentError.message}`);
        }
      }

      await client.query("COMMIT");

      // Prepare response
      const response = {
        success: true, // Always true for successfully processed batch requests
        message: `Successfully logged ${results.length} student(s)`,
        results: results,
        totalStudents: students.length,
        successCount: results.length,
        errorCount: errors.length,
      };

      if (errors.length > 0) {
        response.errors = errors;
        response.message += `, ${errors.length} error(s) occurred`;
      }

      res.json(response);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Batch community logging error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process batch community logging",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// Individual community service logging - UPDATED
router.post("/log-community", authMiddleware.verifyToken, async (req, res) => {
  try {
    const { studentName, hours, dateCompleted, description } = req.body;
    const hoursFloat = parseFloat(hours);
    console.log("Processing hours:", { received: hours, parsed: hoursFloat });

    const organizationId = req.user.id;

    const validationErrors = await validateServiceHours(
      hoursFloat,
      dateCompleted,
      studentName,
      description,
      organizationId // Pass organizationId for validation
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(", "),
      });
    }

    const studentResult = await db.query(
      "SELECT id FROM users WHERE LOWER(full_name) = LOWER($1) AND user_type = $2",
      [studentName, "student"]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const insertResult = await db.query(
      `INSERT INTO service_records (
                user_id,
                hours,
                service_type,
                description,
                date_completed,
                organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, hours`,
      [
        studentResult.rows[0].id,
        hoursFloat,
        "community",
        description,
        dateCompleted,
        organizationId,
      ]
    );

    await db.query(
      "UPDATE users SET total_hours = total_hours + $1 WHERE id = $2",
      [hoursFloat, studentResult.rows[0].id]
    );

    res.json({
      success: true,
      message: "Community service hours logged successfully!",
      recordId: insertResult.rows[0].id,
      hoursLogged: hoursFloat,
    });
  } catch (error) {
    console.error("Error logging community service hours:", error);
    res.status(500).json({ message: "Failed to log service hours" });
  }
});

// Batch logging for teachers (school service) - Keep existing limits
router.post("/batch-log", authMiddleware.verifyToken, async (req, res) => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const {
      students, // Array of student objects [{firstName, surname, hours}, ...]
      dateCompleted,
      description,
    } = req.body;

    const teacherId = req.user.id;

    // Validate common fields
    if (!dateCompleted || !description || !students || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (description.length < 8 || description.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Description must be between 8 and 200 characters",
      });
    }

    const results = [];
    const errors = [];

    // Process each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const { firstName, surname, hours } = student;

      try {
        // Validate student data (keep 10 hour limit for teachers)
        const hoursFloat = parseFloat(hours);
        if (isNaN(hoursFloat) || hoursFloat < 0.5 || hoursFloat > 10) {
          errors.push(`Student ${i + 1}: Hours must be between 0.5 and 10`);
          continue;
        }

        if ((hoursFloat * 10) % 5 !== 0) {
          errors.push(
            `Student ${i + 1}: Hours must be in half hour increments`
          );
          continue;
        }

        if (!firstName || firstName.trim().length <= 1) {
          errors.push(
            `Student ${i + 1}: First name must be longer than 1 character`
          );
          continue;
        }

        if (!surname || surname.trim().length <= 1) {
          errors.push(
            `Student ${i + 1}: Surname must be longer than 1 character`
          );
          continue;
        }

        const fullName = `${firstName.trim()} ${surname.trim()}`;

        // Find student in database
        const studentResult = await client.query(
          "SELECT id FROM users WHERE LOWER(full_name) = LOWER($1) AND user_type = $2",
          [fullName, "student"]
        );

        if (studentResult.rows.length === 0) {
          errors.push(`Student ${i + 1}: ${fullName} not found in database`);
          continue;
        }

        // Insert service record
        const insertResult = await client.query(
          `INSERT INTO service_records (
                        user_id,
                        hours,
                        service_type,
                        description,
                        date_completed,
                        assigned_by
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id, hours`,
          [
            studentResult.rows[0].id,
            hoursFloat,
            "school",
            description,
            dateCompleted,
            teacherId,
          ]
        );

        // Update student's total hours
        await client.query(
          "UPDATE users SET total_hours = total_hours + $1 WHERE id = $2",
          [hoursFloat, studentResult.rows[0].id]
        );

        results.push({
          studentName: fullName,
          hours: hoursFloat,
          recordId: insertResult.rows[0].id,
          success: true,
        });
      } catch (studentError) {
        console.error(`Error processing student ${i + 1}:`, studentError);
        errors.push(`Student ${i + 1}: ${studentError.message}`);
      }
    }

    await client.query("COMMIT");

    // Prepare response
    const response = {
      success: true, // Always true for successfully processed batch requests
      message: `Successfully logged ${results.length} student(s)`,
      results: results,
      totalStudents: students.length,
      successCount: results.length,
      errorCount: errors.length,
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.message += `, ${errors.length} error(s) occurred`;
    }

    res.json(response);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Batch logging error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process batch logging",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// Other routes remain unchanged...
router.get(
  "/student-details/:studentId",
  authMiddleware.verifyToken,
  async (req, res) => {
    try {
      const studentInfo = await db.query(
        `SELECT id, full_name, grade, total_hours 
             FROM users 
             WHERE id = $1 AND user_type = 'student'`,
        [req.params.studentId]
      );

      if (studentInfo.rows.length === 0) {
        return res.status(404).json({
          message:
            "Student not found, please check your spelling of their name.",
        });
      }

      const serviceRecords = await db.query(
        `SELECT 
                sr.id,
                sr.hours,
                sr.service_type,
                sr.description,
                sr.date_completed,
                CASE 
                    WHEN sr.assigned_by IS NOT NULL THEN u.full_name
                    WHEN sr.organization_id IS NOT NULL THEN o.name
                END as assigned_by
             FROM service_records sr
             LEFT JOIN users u ON sr.assigned_by = u.id
             LEFT JOIN organizations o ON sr.organization_id = o.id
             WHERE sr.user_id = $1
             ORDER BY sr.date_completed DESC`,
        [req.params.studentId]
      );

      const schoolHours = serviceRecords.rows
        .filter((record) => record.service_type === "school")
        .reduce((sum, record) => sum + parseFloat(record.hours), 0.0);

      const communityHours = serviceRecords.rows
        .filter((record) => record.service_type === "community")
        .reduce((sum, record) => sum + parseFloat(record.hours), 0.0);

      res.json({
        student: {
          ...studentInfo.rows[0],
          schoolHours,
          communityHours,
        },
        serviceRecords: serviceRecords.rows,
      });
    } catch (error) {
      console.error("Error fetching student details:", error);
      res.status(500).json({ message: "Error fetching student details" });
    }
  }
);

router.get("/search-students", async (req, res) => {
  try {
    const { query } = req.query;

    const result = await db.query(
      `SELECT id, full_name, grade, total_hours 
             FROM users 
             WHERE user_type = 'student' 
             AND LOWER(full_name) LIKE LOWER($1)`,
      [`%${query}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Error searching for students" });
  }
});

router.post("/log", authMiddleware.verifyToken, async (req, res) => {
  try {
    const { studentName, numberOfHours, dateCompleted, description } = req.body;
    const hoursFloat = parseFloat(numberOfHours);
    const teacherId = req.user.id;

    const validationErrors = await validateServiceHours(
      hoursFloat,
      dateCompleted,
      studentName,
      description
      // Note: No organizationId passed, so this will use the default 10-hour limit for teachers
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(", "),
      });
    }

    const studentResult = await db.query(
      "SELECT id FROM users WHERE LOWER(full_name) = LOWER($1) AND user_type = $2",
      [studentName, "student"]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const insertResult = await db.query(
      `INSERT INTO service_records (
                user_id,
                hours,
                service_type,
                description,
                date_completed,
                assigned_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, hours`,
      [
        studentResult.rows[0].id,
        hoursFloat,
        "school",
        description,
        dateCompleted,
        teacherId,
      ]
    );

    await db.query(
      "UPDATE users SET total_hours = total_hours + $1 WHERE id = $2",
      [hoursFloat, studentResult.rows[0].id]
    );

    res.json({
      success: true,
      message: "Service hours logged successfully",
      recordId: insertResult.rows[0].id,
      hoursLogged: hoursFloat,
    });
  } catch (error) {
    console.error("Error logging service hours:", error);
    res.status(500).json({ message: "Failed to log service hours" });
  }
});

module.exports = router;