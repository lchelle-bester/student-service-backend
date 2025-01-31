// backend/createTestOrganizations.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
});

async function createTestOrganizations() {
    const client = await pool.connect();
    
    try {
        console.log('Starting to create test organizations...');
        
        // First, clear existing organizations
        console.log('Clearing existing organizations...');
        await client.query('DELETE FROM organizations');
        
        // Insert test organizations
        const organizations = [
            {
                name: 'Local Food Bank',
                org_key: 'FB001',
                contact_email: 'foodbank@example.com',
                contact_person: 'John Smith'
            },
            {
                name: 'Community Library',
                org_key: 'LIB001',
                contact_email: 'library@example.com',
                contact_person: 'Jane Doe'
            },
            {
                name: 'Animal Shelter',
                org_key: 'AS001',
                contact_email: 'shelter@example.com',
                contact_person: 'Mark Wilson'
            }
        ];

        console.log('Inserting new organizations...');
        
        for (const org of organizations) {
            await client.query(
                `INSERT INTO organizations (
                    name, 
                    org_key, 
                    contact_email, 
                    contact_person
                ) VALUES ($1, $2, $3, $4) RETURNING id`,
                [org.name, org.org_key, org.contact_email, org.contact_person]
            );
            console.log(`Created organization: ${org.name} with key: ${org.org_key}`);
        }

        // Verify organizations were created
        const result = await client.query('SELECT * FROM organizations');
        console.log('\nCreated organizations:');
        console.table(result.rows);

        console.log('\nTest organizations created successfully!');

    } catch (error) {
        console.error('Error creating test organizations:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the function
console.log('Starting script...');
createTestOrganizations()
    .then(() => console.log('Script completed'))
    .catch(error => console.error('Script failed:', error));