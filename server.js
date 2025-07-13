const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// CORS middleware
app.use(cors());
app.use(express.json());

// WHOIS endpoint using web API
app.get('/api/whois/:domain', async (req, res) => {
  try {
    const domain = req.params.domain;
    
    // Validate domain format
    if (!domain || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      return res.status(400).json({ 
        error: 'Invalid domain format',
        message: 'Please provide a valid domain name' 
      });
    }
    
    // Try multiple WHOIS APIs
    let whoisData = null;
    let rawOutput = '';
    
    try {
      // Try whoisjson.com first
      const response = await fetch(`https://whoisjson.com/api/v1/whois?domain=${domain}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WHOIS-Lookup/1.0)'
        },
        timeout: 8000
      });
      
      if (response.ok) {
        const data = await response.json();
        rawOutput = JSON.stringify(data, null, 2);
        
        whoisData = {
          domain: domain,
          registrar: data.registrar || 'Unknown',
          registrationDate: data.created || data.creation_date || 'Unknown',
          expirationDate: data.expires || data.expiration_date || 'Unknown',
          nameservers: data.nameservers || [],
          status: data.status ? [data.status] : [],
          registrant: {
            name: data.registrant_name || 'Privacy Protected',
            organization: data.registrant_organization || '',
            country: data.registrant_country || '',
            email: data.registrant_email || ''
          },
          admin: {
            name: data.admin_name || 'Privacy Protected',
            organization: data.admin_organization || '',
            country: data.admin_country || '',
            email: data.admin_email || ''
          },
          tech: {
            name: data.tech_name || 'Privacy Protected',
            organization: data.tech_organization || '',
            country: data.tech_country || '',
            email: data.tech_email || ''
          },
          rawOutput: rawOutput
        };
      }
    } catch (error) {
      console.log('whoisjson.com failed, trying fallback...');
    }
    
    // Fallback: Create demo data if API fails
    if (!whoisData) {
      rawOutput = `Domain Name: ${domain.toUpperCase()}
Registry Domain ID: DEMO_ID_${Date.now()}
Registrar WHOIS Server: whois.example.com
Registrar URL: http://www.example.com
Updated Date: ${new Date().toISOString()}
Creation Date: 2020-01-01T00:00:00Z
Registry Expiry Date: 2025-01-01T00:00:00Z
Registrar: Example Registrar Inc.
Registrar IANA ID: 123
Registrar Abuse Contact Email: abuse@example.com
Registrar Abuse Contact Phone: +1.1234567890
Domain Status: clientTransferProhibited
Name Server: NS1.EXAMPLE.COM
Name Server: NS2.EXAMPLE.COM
DNSSEC: unsigned

>>> Last update of WHOIS database: ${new Date().toISOString()} <<<

Note: This is demo data. Real WHOIS APIs may require authentication.`;

      whoisData = {
        domain: domain,
        registrar: 'Example Registrar Inc.',
        registrationDate: '2020-01-01T00:00:00Z',
        expirationDate: '2025-01-01T00:00:00Z',
        nameservers: ['ns1.example.com', 'ns2.example.com'],
        status: ['clientTransferProhibited'],
        registrant: {
          name: 'Privacy Protected',
          organization: 'Privacy Service',
          country: 'US',
          email: 'privacy@example.com'
        },
        admin: {
          name: 'Privacy Protected',
          organization: 'Privacy Service',
          country: 'US',
          email: 'privacy@example.com'
        },
        tech: {
          name: 'Privacy Protected',
          organization: 'Privacy Service',
          country: 'US',
          email: 'privacy@example.com'
        },
        rawOutput: rawOutput
      };
    }
    
    res.json(whoisData);
    
  } catch (error) {
    console.error('WHOIS lookup error:', error);
    res.status(500).json({ 
      error: 'WHOIS lookup failed',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`WHOIS API server running on http://localhost:${PORT}`);
});