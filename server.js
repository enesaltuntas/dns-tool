const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = 3001;

// CORS middleware
app.use(cors());
app.use(express.json());

// WHOIS endpoint using terminal command
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
    
    // Execute whois command
    exec(`whois ${domain}`, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('WHOIS command error:', error);
        return res.status(500).json({ 
          error: 'WHOIS lookup failed',
          message: error.message 
        });
      }

      if (stderr) {
        console.error('WHOIS stderr:', stderr);
      }

      // Parse WHOIS output
      const whoisText = stdout;
      
      // Initialize WHOIS data structure
      const whoisData = {
        domain: domain,
        registrar: 'Unknown',
        registrationDate: 'Unknown',
        expirationDate: 'Unknown',
        nameservers: [],
        status: [],
        registrant: {
          name: 'Privacy Protected',
          organization: '',
          country: '',
          email: ''
        },
        admin: {
          name: 'Privacy Protected',
          organization: '',
          country: '',
          email: ''
        },
        tech: {
          name: 'Privacy Protected',
          organization: '',
          country: '',
          email: ''
        },
        rawOutput: whoisText
      };

      if (whoisText) {
        // Parse registrar
        const registrarMatch = whoisText.match(/(?:registrar|sponsoring registrar):\s*(.+)/i);
        if (registrarMatch) {
          whoisData.registrar = registrarMatch[1].trim();
        }

        // Parse creation date
        const createdMatch = whoisText.match(/(?:creation date|created|registered):\s*(.+)/i);
        if (createdMatch) {
          whoisData.registrationDate = createdMatch[1].trim();
        }

        // Parse expiration date
        const expiresMatch = whoisText.match(/(?:expir(?:y|ation) date|expires):\s*(.+)/i);
        if (expiresMatch) {
          whoisData.expirationDate = expiresMatch[1].trim();
        }

        // Parse nameservers
        const nameserverMatches = whoisText.match(/(?:name server|nserver):\s*(.+)/gi);
        if (nameserverMatches) {
          whoisData.nameservers = nameserverMatches.map(ns => 
            ns.replace(/(?:name server|nserver):\s*/i, '').trim().toLowerCase()
          );
        }

        // Parse status
        const statusMatches = whoisText.match(/(?:domain )?status:\s*(.+)/gi);
        if (statusMatches) {
          whoisData.status = statusMatches.map(status => 
            status.replace(/(?:domain )?status:\s*/i, '').trim()
          );
        }

        // Parse registrant info
        const registrantNameMatch = whoisText.match(/(?:registrant|owner)(?:\s+name)?:\s*(.+)/i);
        if (registrantNameMatch) {
          whoisData.registrant.name = registrantNameMatch[1].trim();
        }

        const registrantOrgMatch = whoisText.match(/registrant(?:\s+organization)?:\s*(.+)/i);
        if (registrantOrgMatch) {
          whoisData.registrant.organization = registrantOrgMatch[1].trim();
        }

        const registrantCountryMatch = whoisText.match(/registrant(?:\s+country)?:\s*(.+)/i);
        if (registrantCountryMatch) {
          whoisData.registrant.country = registrantCountryMatch[1].trim();
        }

        const registrantEmailMatch = whoisText.match(/registrant(?:\s+email)?:\s*(.+)/i);
        if (registrantEmailMatch) {
          whoisData.registrant.email = registrantEmailMatch[1].trim();
        }

        // Parse admin contact
        const adminNameMatch = whoisText.match(/admin(?:\s+name)?:\s*(.+)/i);
        if (adminNameMatch) {
          whoisData.admin.name = adminNameMatch[1].trim();
        }

        const adminOrgMatch = whoisText.match(/admin(?:\s+organization)?:\s*(.+)/i);
        if (adminOrgMatch) {
          whoisData.admin.organization = adminOrgMatch[1].trim();
        }

        const adminCountryMatch = whoisText.match(/admin(?:\s+country)?:\s*(.+)/i);
        if (adminCountryMatch) {
          whoisData.admin.country = adminCountryMatch[1].trim();
        }

        const adminEmailMatch = whoisText.match(/admin(?:\s+email)?:\s*(.+)/i);
        if (adminEmailMatch) {
          whoisData.admin.email = adminEmailMatch[1].trim();
        }

        // Parse tech contact
        const techNameMatch = whoisText.match(/tech(?:\s+name)?:\s*(.+)/i);
        if (techNameMatch) {
          whoisData.tech.name = techNameMatch[1].trim();
        }

        const techOrgMatch = whoisText.match(/tech(?:\s+organization)?:\s*(.+)/i);
        if (techOrgMatch) {
          whoisData.tech.organization = techOrgMatch[1].trim();
        }

        const techCountryMatch = whoisText.match(/tech(?:\s+country)?:\s*(.+)/i);
        if (techCountryMatch) {
          whoisData.tech.country = techCountryMatch[1].trim();
        }

        const techEmailMatch = whoisText.match(/tech(?:\s+email)?:\s*(.+)/i);
        if (techEmailMatch) {
          whoisData.tech.email = techEmailMatch[1].trim();
        }
      }
      
      res.json(whoisData);
    });
    
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