import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS middleware
app.use(cors());
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// WHOIS endpoint using system command
app.get('/api/whois/:domain', async (req, res) => {
  console.log(`WHOIS API called for domain: ${req.params.domain}`);
  try {
    const domain = req.params.domain;
    
    // Validate domain format
    if (!domain || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      return res.status(400).json({ 
        error: 'Invalid domain format',
        message: 'Please provide a valid domain name' 
      });
    }
    
    // Execute WHOIS command
    exec(`whois ${domain}`, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`whois command failed: ${error}`);
        
        // If whois command is not available, provide fallback data
        if (error.code === 'ENOENT' || error.message.includes('command not found')) {
          console.log(`WHOIS command not found, providing fallback data for ${domain}`);
          
          const fallbackData = {
            domain: domain,
            registrar: 'N/A (whois command not available)',
            registrationDate: 'N/A',
            expirationDate: 'N/A',
            nameservers: [],
            status: ['Command not available on server'],
            registrant: { name: 'N/A' },
            admin: { name: 'N/A' },
            tech: { name: 'N/A' },
            rawOutput: 'WHOIS command not available on this server'
          };
          
          return res.json(fallbackData);
        }
        
        return res.status(500).json({ 
          error: 'WHOIS lookup failed',
          message: error.message 
        });
      }
      
      if (stderr) {
        console.error(`whois stderr: ${stderr}`);
      }
      
      const rawOutput = stdout;
      
      // Parse WHOIS output
      const lines = rawOutput.split('\n');
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
        rawOutput: rawOutput
      };
      
      // Parse key information from WHOIS output
      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('registrar:') && !lowerLine.includes('registrar whois')) {
          whoisData.registrar = line.split(':')[1]?.trim() || 'Unknown';
        } else if (lowerLine.includes('creation date:') || lowerLine.includes('created:')) {
          whoisData.registrationDate = line.split(':')[1]?.trim() || 'Unknown';
        } else if (lowerLine.includes('expiry date:') || lowerLine.includes('expires:') || lowerLine.includes('expiration date:')) {
          whoisData.expirationDate = line.split(':')[1]?.trim() || 'Unknown';
        } else if (lowerLine.includes('name server:') || lowerLine.includes('nameserver:')) {
          const nameserver = line.split(':')[1]?.trim();
          if (nameserver && !whoisData.nameservers.includes(nameserver)) {
            whoisData.nameservers.push(nameserver);
          }
        } else if (lowerLine.includes('status:') || lowerLine.includes('domain status:')) {
          const status = line.split(':')[1]?.trim();
          if (status && !whoisData.status.includes(status)) {
            whoisData.status.push(status);
          }
        }
      });
      
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

// Catch-all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`DNS Tool server running on http://localhost:${PORT}`);
  console.log(`Serving static files from: ${path.join(__dirname, 'dist')}`);
});