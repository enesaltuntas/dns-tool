const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const PORT = 3001;

// CORS middleware
app.use(cors());
app.use(express.json());

// WHOIS endpoint
app.get('/api/whois/:domain', async (req, res) => {
  try {
    const domain = req.params.domain;
    
    // IANA WHOIS sayfasını crawl et
    const response = await fetch(`https://www.iana.org/whois?q=${domain}`);
    const html = await response.text();
    
    // HTML'i parse et
    const $ = cheerio.load(html);
    
    // WHOIS bilgilerini extract et
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
      }
    };

    // IANA sayfasından bilgileri parse et
    const whoisText = $('.iana-table').text() || $('pre').text() || '';
    
    if (whoisText) {
      // Registrar bilgisi
      const registrarMatch = whoisText.match(/registrar:\s*(.+)/i);
      if (registrarMatch) {
        whoisData.registrar = registrarMatch[1].trim();
      }
      
      // Nameserver bilgileri
      const nameserverMatches = whoisText.match(/name server:\s*(.+)/gi);
      if (nameserverMatches) {
        whoisData.nameservers = nameserverMatches.map(ns => 
          ns.replace(/name server:\s*/i, '').trim()
        );
      }
      
      // Status bilgisi
      const statusMatches = whoisText.match(/status:\s*(.+)/gi);
      if (statusMatches) {
        whoisData.status = statusMatches.map(status => 
          status.replace(/status:\s*/i, '').trim()
        );
      }
      
      // Tarih bilgileri
      const createdMatch = whoisText.match(/creation date:\s*(.+)/i);
      if (createdMatch) {
        whoisData.registrationDate = createdMatch[1].trim();
      }
      
      const expiresMatch = whoisText.match(/expir(?:y|ation) date:\s*(.+)/i);
      if (expiresMatch) {
        whoisData.expirationDate = expiresMatch[1].trim();
      }
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