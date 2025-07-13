# 🌐 DNS Analyzer Tool

**Modern & Comprehensive DNS Analysis Tool**

A professional tool designed for advanced DNS and WHOIS analysis, featuring a Matrix-themed terminal interface. Analyze your domain records, test nameserver configurations, and query WHOIS information.

## ✨ Features

### 🔍 DNS Analysis
- **Parent Domain Analysis**: Parent domain nameserver delegation and glue record control
- **NS Records**: Nameserver configuration and redundancy tests
- **SOA Records**: Start of Authority record validation and timing analysis
- **MX Records**: Mail exchange record configuration and resolution tests
- **WWW Records**: WWW subdomain A/CNAME record analysis and validation

### 👤 WHOIS Lookup
- Domain registration information
- Registrar information
- Registration and expiration dates
- Nameserver list
- Contact information (Registrant, Admin, Tech)
- Domain status

### 🎨 User Experience
- **Matrix-Themed Interface**: Futuristic terminal experience
- **Real-Time Analysis**: Fast and efficient DNS testing
- **Responsive Design**: Perfect appearance on all devices
- **Typing Animation**: Terminal typing effect
- **Copy Feature**: One-click result copying

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0+
- npm or yarn

### Installation

```bash
# Clone the project
git clone https://github.com/enesaltuntas/dns-tool.git
cd dns-tool

# Install dependencies
npm install
# or
yarn install

# Start the development server
npm run dev
# or
yarn dev
```

The application will run at [http://localhost:3000](http://localhost:3000).

## 🛠️ Usage

### DNS Analysis
1. Enter the domain name on the main page (e.g., `example.com`)
2. Select the "DNS ANALYSIS" tab
3. Click the "ANALYZE" button
4. Review results in 5 different categories

### WHOIS Lookup
1. Enter the domain name
2. Select the "WHOIS LOOKUP" tab
3. Click the "LOOKUP" button
4. View detailed domain information

### URL Routing
You can perform domain analysis directly via URL:
```
http://localhost:3000/example.com
```

## 📊 Analysis Categories

### 🌍 PARENT
- Parent domain nameserver delegation
- Glue record control
- Nameserver accessibility
- Multiple nameserver redundancy

### 🖥️ NS (Nameserver)
- Nameserver configuration
- DNS server responses
- Different subnet control
- Nameserver validation

### ⚡ SOA (Start of Authority)
- Primary nameserver information
- Hostmaster email address
- Refresh, Retry, Expire settings
- Minimum TTL control

### 📧 MX (Mail Exchange)
- Mail server configuration
- MX record priority
- Mail server accessibility
- A record resolution

### 🌐 WWW Subdomain
- WWW subdomain configuration
- A and CNAME record analysis
- IP address resolution
- Public IP control

## 🔧 Technical Details

### Technology Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **DNS API**: Cloudflare DNS over HTTPS (1.1.1.1)
- **WHOIS**: whois-json package

### Project Structure
```
dns-tool/
├── app/
│   ├── [domain]/           # Dynamic domain pages
│   │   └── page.tsx
│   ├── api/
│   │   └── whois/          # WHOIS API endpoint
│   │       └── route.ts
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Main layout
│   └── page.tsx            # Main page
├── types/
│   └── whois.d.ts          # TypeScript type definitions
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

### API Endpoints
- `GET /api/whois?domain={domain}` - Returns WHOIS information

### DNS Queries
- Uses Cloudflare DNS over HTTPS API
- JSON format responses
- Secure and fast queries

## 🎯 Performance

- **DNS Analysis**: ~2-5 seconds
- **WHOIS Lookup**: ~1-3 seconds
- **Parallel Tests**: All DNS tests run in parallel
- **Responsive**: Optimized for all devices

## 🔒 Security

- Domain format validation
- XSS protection
- Rate limiting recommendation
- HTTPS requirement

## 📝 Development

### Commands
```bash
# Development
npm run dev

# Build
npm run build

# Production start
npm run start

# Linting
npm run lint
```

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 🚨 Important Notes

### Production Usage
- Integrate a reliable WHOIS API service for real production environments
- Implement rate limiting
- Add caching mechanism
- Improve error handling

### Recommended WHOIS Services
- [whoisjson.com](https://whoisjson.com)
- [whoisfreaks.com](https://whoisfreaks.com)
- [whoxy.com](https://whoxy.com)

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## 🤝 Support

- **Issues**: Use the GitHub issues page
- **Documentation**: Keep the README.md file up to date
- **Suggestions**: Feature requests are welcome

## 🌟 Screenshots

### Main Page
Professional appearance with Matrix-themed terminal interface

### DNS Analysis
Comprehensive DNS tests and detailed results

### WHOIS Lookup
Clean and readable WHOIS information

---

**DNS Analyzer v3.2.0** - Modern tool developed for powerful DNS analysis

> 💡 This tool is designed for DNS administrators, system administrators, and web developers.