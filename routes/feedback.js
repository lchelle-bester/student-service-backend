// routes/feedback.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const multer = require('multer');
const authMiddleware = require('../middleware/auth'); // Adjust path if needed

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

// Configure email transporter
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Submit feedback route
router.post('/submit', authMiddleware.verifyToken, upload.single('screenshot'), async (req, res) => {
  try {
    const { issueType, description, priority, contactEmail, context, userId } = req.body;

    // Validate required fields
    if (!issueType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Issue type and description are required'
      });
    }

    let screenshotUrl = null;

    // Handle screenshot upload
    if (req.file) {
      const filename = `feedback-screenshots/${Date.now()}-${Math.random().toString(36).substring(7)}.${req.file.originalname.split('.').pop()}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('feedback-attachments')
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('feedback-attachments')
          .getPublicUrl(filename);
        screenshotUrl = publicUrl;
      }
    }

    // Insert feedback into database
    const { data: feedbackData, error: insertError } = await supabase
      .from('user_feedback')
      .insert([{
        user_id: userId || null,
        user_type: req.user?.user_type || 'unknown',
        issue_type: issueType,
        description: description,
        priority: priority || 'medium',
        contact_email: contactEmail || null,
        context_info: JSON.parse(context || '{}'),
        screenshot_url: screenshotUrl,
        status: 'open'
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit feedback'
      });
    }

    // Send email notification
    await sendFeedbackNotification({
      feedbackId: feedbackData.id,
      issueType,
      description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
      priority,
      userType: req.user?.user_type,
      userEmail: req.user?.email,
      contactEmail,
      screenshotUrl,
      contextInfo: JSON.parse(context || '{}')
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedbackData.id,
      ticketNumber: `SSD-${feedbackData.id.toString().padStart(6, '0')}`
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
});

// Email notification function
async function sendFeedbackNotification(data) {
  try {
    const ticketNumber = `SSD-${data.feedbackId.toString().padStart(6, '0')}`;
    
    const emailContent = `
New feedback received for Student Service Diary:

Ticket Number: ${ticketNumber}
Issue Type: ${data.issueType.toUpperCase()}
Priority: ${data.priority.toUpperCase()}
User Type: ${data.userType || 'Unknown'}
User Email: ${data.userEmail || 'Not provided'}
Contact Email: ${data.contactEmail || 'Not provided'}

Description:
${data.description}

${data.screenshotUrl ? `Screenshot: ${data.screenshotUrl}` : 'No screenshot provided'}

Context Information:
- Page: ${data.contextInfo.currentUrl || 'Unknown'}
- Browser: ${data.contextInfo.userAgent || 'Unknown'}
- Timestamp: ${data.contextInfo.timestamp || 'Unknown'}

Please check your admin panel to manage this feedback.
    `;

    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'lchelle.best@gmail.com',
      subject: `[${data.priority.toUpperCase()}] Student Service Diary - ${ticketNumber}`,
      text: emailContent
    });

    console.log(`Email sent for feedback ${data.feedbackId}`);
  } catch (error) {
    console.error('Email error:', error);
  }
}

module.exports = router;