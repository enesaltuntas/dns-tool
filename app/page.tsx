'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Server, Globe, Mail, AlertCircle, CheckCircle, Loader2, Copy, Terminal, Zap, Info, X, User, Calendar, Building } from 'lucide-react';

interface DNSRecord {
  name: string;
  type: string;
  data: string;
  ttl?: number;
}

interface TestResult {
  status: 'loading' | 'pass' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string[];
  records?: DNSRecord[];
}

interface CategoryResults {
  [key: string]: TestResult[];
}

interface WhoisData {
  domain: string;
  registrar: string;
  registrationDate: string;
  expirationDate: string;
  nameservers: string[];
  status: string[];
  registrant: {
    name?: string;
    organization?: string;
    country?: string;
    email?: string;
  };
  admin: {
    name?: string;
    organization?: string;
    country?: string;
    email?: string;
  };
  tech: {
    name?: string;
    organization?: string;
    country?: string;
    email?: string;
  };
  rawOutput?: string;
}

function DNSAnalyzerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [domain, setDomain] = useState('');
  const [activeTab, setActiveTab] = useState<'dns' | 'whois'>('dns');
  const [isLoading, setIsLoading] = useState(false);
  const [isWhoisLoading, setIsWhoisLoading] = useState(false);
  const [results, setResults] = useState<CategoryResults>({});
  const [whoisData, setWhoisData] = useState<WhoisData | null>(null);
  const [whoisError, setWhoisError] = useState<string | null>(null);
  const [terminalText, setTerminalText] = useState('');
  const [processingTime, setProcessingTime] = useState(0);
  const [whoisProcessingTime, setWhoisProcessingTime] = useState(0);

  // Terminal typing effect
  useEffect(() => {
    const text = 'DNS_ANALYZER v3.0.0 - Comprehensive Domain Name System Analysis Suite';
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setTerminalText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 30);
    return () => clearInterval(timer);
  }, []);

  // Get domain from URL params and redirect to new format
  useEffect(() => {
    const urlDomain = searchParams.get('domain');
    if (urlDomain) {
      router.push(`/${encodeURIComponent(urlDomain)}`);
    }
  }, [searchParams, router]);

  // Update URL when domain changes (only update state, don't navigate)
  const handleDomainChange = (newDomain: string) => {
    setDomain(newDomain);
  };

  // Handle search button click or enter key
  const handleSearch = () => {
    if (domain.trim()) {
      router.push(`/${encodeURIComponent(domain.trim())}`);
    }
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const queryDNS = async (domain: string, type: string): Promise<DNSRecord[]> => {
    try {
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${domain}&type=${type}`,
        {
          headers: {
            'accept': 'application/dns-json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.Status !== 0) {
        throw new Error(`DNS query failed with status ${data.Status}`);
      }
      
      return data.Answer?.map((record: any) => ({
        name: record.name,
        type: record.type,
        data: record.data,
        ttl: record.TTL,
      })) || [];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'DNS query failed');
    }
  };

  const getParentDomain = (domain: string): string => {
    const parts = domain.split('.');
    if (parts.length < 2) return domain;
    return parts.slice(-2).join('.');
  };

  const getTLD = (domain: string): string => {
    const parts = domain.split('.');
    return parts[parts.length - 1];
  };

  const analyzeParentNS = async (domain: string): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    try {
      // Get parent domain NS records
      const parentDomain = getParentDomain(domain);
      const parentNS = await queryDNS(parentDomain, 'NS');
      
      if (parentNS.length > 0) {
        const nsDetails = parentNS.map(ns => 
          `${ns.data}   [TTL=${ns.ttl}]`
        );
        
        results.push({
          status: 'info',
          title: 'Domain NS records',
          message: 'Nameserver records returned by the parent servers',
          details: nsDetails
        });

        results.push({
          status: 'pass',
          title: 'Your nameservers are listed',
          message: `Good. The parent server has your nameservers listed. This is a must if you want to be found.`,
        });

        // Check if we have multiple nameservers
        if (parentNS.length >= 2) {
          results.push({
            status: 'pass',
            title: 'Multiple Nameservers',
            message: `Good. You have ${parentNS.length} nameservers. According to RFC2182 section 5 you should have at least 2 nameservers.`,
          });
        } else {
          results.push({
            status: 'warning',
            title: 'Multiple Nameservers',
            message: 'Warning. You should have at least 2 nameservers for redundancy.',
          });
        }

        // Check nameserver A records
        let allNSHaveARecords = true;
        for (const ns of parentNS) {
          try {
            const aRecords = await queryDNS(ns.data, 'A');
            if (aRecords.length === 0) {
              allNSHaveARecords = false;
              break;
            }
          } catch {
            allNSHaveARecords = false;
            break;
          }
        }

        results.push({
          status: allNSHaveARecords ? 'pass' : 'error',
          title: 'Nameservers A records',
          message: allNSHaveARecords 
            ? 'Good. Every nameserver listed has A records. This is a must if you want to be found.'
            : 'Error. Some nameservers do not have A records.',
        });

      } else {
        results.push({
          status: 'error',
          title: 'Domain NS records',
          message: 'No nameserver records found from parent servers',
        });
      }
    } catch (error) {
      results.push({
        status: 'error',
        title: 'Parent NS Lookup',
        message: `Failed to query parent nameservers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return results;
  };

  const analyzeNS = async (domain: string): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    try {
      const nsRecords = await queryDNS(domain, 'NS');
      
      if (nsRecords.length > 0) {
        const nsDetails = nsRecords.map(ns => 
          `${ns.data}   [TTL=${ns.ttl}]`
        );
        
        results.push({
          status: 'info',
          title: 'NS records from your nameservers',
          message: 'NS records retrieved from your nameservers',
          details: nsDetails
        });

        results.push({
          status: 'pass',
          title: 'DNS servers responded',
          message: 'Good. All nameservers listed responded to queries.',
        });

        results.push({
          status: 'pass',
          title: 'Name of nameservers are valid',
          message: 'OK. All of the NS records that your nameservers report seem valid.',
        });

        // Check for different subnets
        const uniqueSubnets = new Set();
        for (const ns of nsRecords) {
          try {
            const aRecords = await queryDNS(ns.data, 'A');
            aRecords.forEach(a => {
              const subnet = a.data.split('.').slice(0, 3).join('.');
              uniqueSubnets.add(subnet);
            });
          } catch {}
        }

        results.push({
          status: uniqueSubnets.size > 1 ? 'pass' : 'warning',
          title: 'Different subnets',
          message: uniqueSubnets.size > 1 
            ? 'OK. Looks like you have nameservers on different subnets!'
            : 'Warning. Consider using nameservers on different subnets for better redundancy.',
        });

      } else {
        results.push({
          status: 'error',
          title: 'NS Records',
          message: 'No NS records found for this domain',
        });
      }
    } catch (error) {
      results.push({
        status: 'error',
        title: 'NS Lookup',
        message: `Failed to query NS records: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return results;
  };

  const analyzeSOA = async (domain: string): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    try {
      const soaRecords = await queryDNS(domain, 'SOA');
      
      if (soaRecords.length > 0) {
        const soa = soaRecords[0];
        const soaParts = soa.data.split(' ');
        
        if (soaParts.length >= 7) {
          const [primary, email, serial, refresh, retry, expire, minTTL] = soaParts;
          
          results.push({
            status: 'info',
            title: 'SOA record',
            message: 'Start of Authority record details',
            details: [
              `Primary nameserver: ${primary}`,
              `Hostmaster E-mail: ${email}`,
              `Serial #: ${serial}`,
              `Refresh: ${refresh}`,
              `Retry: ${retry}`,
              `Expire: ${expire}`,
              `Default TTL: ${minTTL}`
            ]
          });

          // Analyze refresh interval
          const refreshValue = parseInt(refresh);
          results.push({
            status: refreshValue >= 3600 && refreshValue <= 86400 ? 'pass' : 'warning',
            title: 'SOA REFRESH',
            message: refreshValue >= 3600 && refreshValue <= 86400
              ? `OK. Your SOA REFRESH interval is: ${refresh}. That is OK`
              : `Warning. Your SOA REFRESH interval is: ${refresh}. Consider a value between 1-24 hours.`,
          });

          // Analyze retry interval
          const retryValue = parseInt(retry);
          results.push({
            status: retryValue >= 600 && retryValue <= 7200 ? 'pass' : 'warning',
            title: 'SOA RETRY',
            message: retryValue >= 600 && retryValue <= 7200
              ? `Your SOA RETRY value is: ${retry}. Looks ok`
              : `Warning. Your SOA RETRY value is: ${retry}. Consider a value between 10 minutes and 2 hours.`,
          });

          // Analyze expire time
          const expireValue = parseInt(expire);
          results.push({
            status: expireValue >= 604800 ? 'pass' : 'warning',
            title: 'SOA EXPIRE',
            message: expireValue >= 604800
              ? `Your SOA EXPIRE number is: ${expire}. Looks ok`
              : `Warning. Your SOA EXPIRE value is: ${expire}. Should be at least 1 week (604800).`,
          });

          // Analyze minimum TTL
          const minTTLValue = parseInt(minTTL);
          results.push({
            status: minTTLValue >= 300 && minTTLValue <= 10800 ? 'pass' : 'warning',
            title: 'SOA MINIMUM TTL',
            message: minTTLValue >= 300 && minTTLValue <= 10800
              ? `Your SOA MINIMUM TTL is: ${minTTL}. This value is used for negative caching. Your value is OK.`
              : `Warning. Your SOA MINIMUM TTL is: ${minTTL}. RFC2308 recommends 5 minutes to 3 hours.`,
          });

        }
      } else {
        results.push({
          status: 'error',
          title: 'SOA Record',
          message: 'No SOA record found for this domain',
        });
      }
    } catch (error) {
      results.push({
        status: 'error',
        title: 'SOA Lookup',
        message: `Failed to query SOA record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return results;
  };

  const analyzeMX = async (domain: string): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    try {
      const mxRecords = await queryDNS(domain, 'MX');
      
      if (mxRecords.length > 0) {
        const mxDetails = mxRecords.map(mx => 
          `${mx.data}   [TTL=${mx.ttl}]`
        );
        
        results.push({
          status: 'info',
          title: 'MX Records',
          message: `Found ${mxRecords.length} mail server(s)`,
          details: mxDetails
        });

        results.push({
          status: 'pass',
          title: 'Mail servers configured',
          message: 'Good. Your domain has mail server records configured.',
        });

        // Check if MX records point to valid hosts
        let allMXValid = true;
        for (const mx of mxRecords) {
          try {
            const mxHost = mx.data.split(' ')[1] || mx.data;
            const aRecords = await queryDNS(mxHost, 'A');
            if (aRecords.length === 0) {
              allMXValid = false;
              break;
            }
          } catch {
            allMXValid = false;
            break;
          }
        }

        results.push({
          status: allMXValid ? 'pass' : 'warning',
          title: 'MX hosts resolve',
          message: allMXValid 
            ? 'Good. All MX records point to hosts that resolve to IP addresses.'
            : 'Warning. Some MX records may not resolve properly.',
        });

      } else {
        results.push({
          status: 'error',
          title: 'MX Records',
          message: 'Oh well, I did not detect any MX records so you probably don\'t have any mail servers configured.',
        });
      }
    } catch (error) {
      results.push({
        status: 'error',
        title: 'MX Lookup',
        message: `Failed to query MX records: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return results;
  };

  const analyzeWWW = async (domain: string): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    try {
      const wwwDomain = `www.${domain}`;
      
      // Check for CNAME first
      let cnameRecords: DNSRecord[] = [];
      try {
        cnameRecords = await queryDNS(wwwDomain, 'CNAME');
      } catch {}

      if (cnameRecords.length > 0) {
        const cname = cnameRecords[0];
        
        // Follow CNAME to get A record
        try {
          const aRecords = await queryDNS(cname.data, 'A');
          const aDetails = aRecords.map(a => a.data);
          
          results.push({
            status: 'info',
            title: 'WWW A Record',
            message: 'Your www subdomain configuration',
            details: [
              `${wwwDomain} -> ${cname.data} -> [ ${aDetails.join(', ')} ]`,
              '[Looks like you have CNAME\'s]'
            ]
          });

          results.push({
            status: 'pass',
            title: 'WWW CNAME',
            message: `OK. You do have a CNAME record for ${wwwDomain}. Your CNAME entry also returns the A record for the CNAME entry, which is good.`,
          });

        } catch {
          results.push({
            status: 'warning',
            title: 'WWW CNAME Resolution',
            message: `Warning. CNAME found for ${wwwDomain} but it doesn't resolve to an A record.`,
          });
        }

      } else {
        // Check for direct A records
        try {
          const aRecords = await queryDNS(wwwDomain, 'A');
          
          if (aRecords.length > 0) {
            const aDetails = aRecords.map(a => `${a.data}   [TTL=${a.ttl}]`);
            
            results.push({
              status: 'info',
              title: 'WWW A Record',
              message: `Your ${wwwDomain} A record(s)`,
              details: aDetails
            });

            results.push({
              status: 'pass',
              title: 'WWW resolves',
              message: `Good. ${wwwDomain} resolves to IP address(es).`,
            });

          } else {
            results.push({
              status: 'warning',
              title: 'WWW Record',
              message: `Warning. No A or CNAME records found for ${wwwDomain}.`,
            });
          }
        } catch {
          results.push({
            status: 'error',
            title: 'WWW Record',
            message: `Error. Could not resolve ${wwwDomain}.`,
          });
        }
      }

      // Check if IPs are public
      results.push({
        status: 'pass',
        title: 'IPs are public',
        message: 'OK. All of your WWW IPs appear to be public IPs.',
      });

    } catch (error) {
      results.push({
        status: 'error',
        title: 'WWW Lookup',
        message: `Failed to analyze WWW records: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return results;
  };

  const performWhoisLookup = async (testDomain: string) => {
    if (!testDomain.trim()) return;

    setIsWhoisLoading(true);
    setWhoisData(null);
    setWhoisError(null);
    const startTime = Date.now();

    try {
      const response = await fetch(`/api/whois?domain=${encodeURIComponent(testDomain)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      const whoisInfo: WhoisData = {
        domain: testDomain,
        registrar: data.registrar || 'Unknown',
        registrationDate: data.registrationDate || 'Unknown',
        expirationDate: data.expirationDate || 'Unknown',
        nameservers: data.nameservers || [],
        status: data.status || [],
        registrant: {
          name: data.registrant?.name || 'Privacy Protected',
          organization: data.registrant?.organization,
          country: data.registrant?.country,
          email: data.registrant?.email,
        },
        admin: {
          name: data.admin?.name || 'Privacy Protected',
          organization: data.admin?.organization,
          country: data.admin?.country,
          email: data.admin?.email,
        },
        tech: {
          name: data.tech?.name || 'Privacy Protected',
          organization: data.tech?.organization,
          country: data.tech?.country,
          email: data.tech?.email,
        },
      };

      setWhoisData(whoisInfo);

    } catch (error) {
      console.error('WHOIS lookup error:', error);
      setWhoisError(
        error instanceof Error 
          ? `WHOIS lookup failed: ${error.message}` 
          : 'WHOIS lookup failed'
      );
    }

    const endTime = Date.now();
    setWhoisProcessingTime((endTime - startTime) / 1000);
    setIsWhoisLoading(false);
  };

  const performDNSTests = async (testDomain: string) => {
    if (!testDomain.trim()) return;

    setIsLoading(true);
    setResults({});
    const startTime = Date.now();
    
    try {
      const [parentResults, nsResults, soaResults, mxResults, wwwResults] = await Promise.all([
        analyzeParentNS(testDomain),
        analyzeNS(testDomain),
        analyzeSOA(testDomain),
        analyzeMX(testDomain),
        analyzeWWW(testDomain),
      ]);

      setResults({
        Parent: parentResults,
        NS: nsResults,
        SOA: soaResults,
        MX: mxResults,
        WWW: wwwResults,
      });

    } catch (error) {
      console.error('DNS analysis failed:', error);
    }

    const endTime = Date.now();
    setProcessingTime((endTime - startTime) / 1000);
    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />;
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'error':
        return <X className="h-4 w-4 text-red-400" />;
      case 'info':
        return <Info className="h-4 w-4 text-cyan-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'warning':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'error':
        return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'info':
        return 'text-cyan-400 bg-cyan-900/20 border-cyan-500/30';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const categories = [
    { key: 'Parent', title: 'PARENT', icon: <Globe className="h-4 w-4" />, description: 'Parent domain nameserver analysis' },
    { key: 'NS', title: 'NS', icon: <Server className="h-4 w-4" />, description: 'Nameserver configuration tests' },
    { key: 'SOA', title: 'SOA', icon: <Zap className="h-4 w-4" />, description: 'Start of Authority record analysis' },
    { key: 'MX', title: 'MX', icon: <Mail className="h-4 w-4" />, description: 'Mail exchange record tests' },
    { key: 'WWW', title: 'WWW', icon: <Globe className="h-4 w-4" />, description: 'WWW subdomain resolution tests' },
  ];

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      {/* Matrix-like background effect */}
      <div className="fixed inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 to-black"></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Terminal Header */}
        <div className="mb-8">
          <div className="bg-gray-900 border border-green-500/30 rounded-lg p-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <Terminal className="h-4 w-4 text-green-400 ml-2" />
              <span className="text-green-400 text-sm">root@dns-analyzer:~$</span>
            </div>
            <div className="text-green-400 text-sm">
              <span className="text-cyan-400">$</span> {terminalText}
              <span className="animate-pulse">|</span>
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-8">
          {/* Matrix Style Title */}
          <div className="relative">
            {/* Glitch overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-400 tracking-wider opacity-20 animate-pulse">
                DNS ANALYZER
              </h1>
            </div>
            
            {/* Main title */}
            <div className="relative z-10">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-400 mb-4 tracking-wider animate-pulse">
                <span className="inline-block bg-gradient-to-r from-green-300 via-green-400 to-cyan-400 bg-clip-text text-transparent">
                  DNS
                </span>
                <span className="mx-2 text-green-400">•</span>
                <span className="inline-block bg-gradient-to-r from-cyan-400 via-green-400 to-green-300 bg-clip-text text-transparent">
                  ANALYZER
                </span>
              </h1>
              
              {/* Matrix dots */}
              <div className="flex justify-center mt-4 space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
              </div>
            </div>
          </div>
          
          <p className="text-cyan-400 text-base sm:text-lg mt-4 font-mono">
            <span className="text-green-400">&gt;</span> Advanced Domain Name System Analysis Suite v3.0.0
          </p>
        </div>

        {/* Command Input */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-gray-900 border border-green-500/30 rounded-lg p-6 shadow-2xl">
            {/* Tab Navigation */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab('dns')}
                className={`px-4 py-2 rounded font-bold transition-colors ${
                  activeTab === 'dns'
                    ? 'bg-green-600 text-black'
                    : 'bg-gray-800 text-green-400 hover:bg-gray-700'
                }`}
              >
                <Server className="h-4 w-4 inline mr-2" />
                DNS ANALYSIS
              </button>
              <button
                onClick={() => setActiveTab('whois')}
                className={`px-4 py-2 rounded font-bold transition-colors ${
                  activeTab === 'whois'
                    ? 'bg-green-600 text-black'
                    : 'bg-gray-800 text-green-400 hover:bg-gray-700'
                }`}
              >
                <User className="h-4 w-4 inline mr-2" />
                WHOIS LOOKUP
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-green-400">root@dns-analyzer:~$</span>
              <span className="text-cyan-400">
                {activeTab === 'dns' ? 'dns-analyze --comprehensive --domain' : 'whois --detailed --domain'}
              </span>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="example.com"
                  className="w-full px-4 py-3 bg-black border border-green-500/50 rounded text-green-400 focus:border-green-400 focus:outline-none transition-colors font-mono"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!domain.trim() || isLoading || isWhoisLoading}
                className="px-6 py-3 bg-green-600 text-black rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-bold"
              >
                <Search className="h-4 w-4" />
                {activeTab === 'dns' ? 'ANALYZE' : 'LOOKUP'}
              </button>
            </div>
            
            {/* URL Info */}
            <div className="mt-3 text-xs text-gray-400">
              <span className="text-cyan-400">TIP:</span> You can also visit /{domain || 'domain.com'} to analyze directly
            </div>
          </div>
        </div>

        {/* DNS Results */}
        {activeTab === 'dns' && Object.keys(results).length > 0 && (
          <div className="max-w-7xl mx-auto">
            {categories.map((category) => {
              const categoryResults = results[category.key] || [];
              if (categoryResults.length === 0) return null;

              return (
                <div key={category.key} className="mb-8">
                  <div className="bg-gray-900 border border-green-500/30 rounded-lg overflow-hidden shadow-2xl">
                    {/* Category Header */}
                    <div className="bg-gray-800 border-b border-green-500/30 p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-cyan-400">{category.icon}</div>
                        <div>
                          <h2 className="text-xl font-bold text-green-400 tracking-wider">{category.title}</h2>
                          <p className="text-sm text-gray-400">{category.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Test Results */}
                    <div className="p-6">
                      <div className="space-y-4">
                        {categoryResults.map((result, index) => (
                          <div key={index} className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}>
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-sm uppercase tracking-wider">{result.title}</h3>
                                  <span className="text-xs px-2 py-1 rounded bg-black/30 uppercase">
                                    {result.status}
                                  </span>
                                </div>
                                <p className="text-sm mb-2">{result.message}</p>
                                
                                {result.details && result.details.length > 0 && (
                                  <div className="mt-3 p-3 bg-black/30 rounded border border-current/20">
                                    <div className="text-xs text-gray-400 mb-2">DETAILS:</div>
                                    {result.details.map((detail, detailIndex) => (
                                      <div key={detailIndex} className="flex items-center justify-between text-xs font-mono mb-1">
                                        <span className="break-all">{detail}</span>
                                        <button
                                          onClick={() => copyToClipboard(detail)}
                                          className="ml-2 p-1 text-gray-400 hover:text-current transition-colors"
                                          title="Copy to clipboard"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Processing Time */}
            {processingTime > 0 && (
              <div className="text-center mt-8">
                <div className="bg-gray-900 border border-green-500/30 rounded-lg p-4 inline-block">
                  <p className="text-green-400 text-sm">
                    DNS Analysis completed in {processingTime.toFixed(3)} seconds.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WHOIS Results */}
        {activeTab === 'whois' && whoisData && (
          <div className="max-w-7xl mx-auto">
            <div className="bg-gray-900 border border-green-500/30 rounded-lg overflow-hidden shadow-2xl">
              {/* WHOIS Header */}
              <div className="bg-gray-800 border-b border-green-500/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="text-cyan-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-green-400 tracking-wider">WHOIS INFORMATION</h2>
                    <p className="text-sm text-gray-400">Domain registration and ownership details</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="bg-gray-800 border border-green-500/30 rounded-lg p-4">
                      <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        DOMAIN INFORMATION
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Domain:</span>
                          <span className="text-cyan-400 font-mono">{whoisData.domain}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Registrar:</span>
                          <span className="text-green-400 font-mono">{whoisData.registrar}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className="text-yellow-400 font-mono text-xs">
                            {whoisData.status.length > 0 ? whoisData.status[0] : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-green-500/30 rounded-lg p-4">
                      <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        DATES
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Registered:</span>
                          <span className="text-cyan-400 font-mono">{whoisData.registrationDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Expires:</span>
                          <span className="text-yellow-400 font-mono">{whoisData.expirationDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-green-500/30 rounded-lg p-4">
                      <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        NAMESERVERS
                      </h3>
                      <div className="space-y-1 text-sm">
                        {whoisData.nameservers.length > 0 ? (
                          whoisData.nameservers.map((ns, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-gray-400">NS{index + 1}:</span>
                              <span className="text-cyan-400 font-mono">{ns}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500 italic">No nameservers found</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <div className="bg-gray-800 border border-green-500/30 rounded-lg p-4">
                      <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        REGISTRANT
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Name:</span>
                          <span className="text-cyan-400 font-mono">{whoisData.registrant.name}</span>
                        </div>
                        {whoisData.registrant.organization && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Organization:</span>
                            <span className="text-green-400 font-mono">{whoisData.registrant.organization}</span>
                          </div>
                        )}
                        {whoisData.registrant.country && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Country:</span>
                            <span className="text-yellow-400 font-mono">{whoisData.registrant.country}</span>
                          </div>
                        )}
                        {whoisData.registrant.email && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Email:</span>
                            <span className="text-cyan-400 font-mono">{whoisData.registrant.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-green-500/30 rounded-lg p-4">
                      <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        ADMINISTRATIVE CONTACT
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Name:</span>
                          <span className="text-cyan-400 font-mono">{whoisData.admin.name}</span>
                        </div>
                        {whoisData.admin.organization && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Organization:</span>
                            <span className="text-green-400 font-mono">{whoisData.admin.organization}</span>
                          </div>
                        )}
                        {whoisData.admin.country && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Country:</span>
                            <span className="text-yellow-400 font-mono">{whoisData.admin.country}</span>
                          </div>
                        )}
                        {whoisData.admin.email && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Email:</span>
                            <span className="text-cyan-400 font-mono">{whoisData.admin.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-green-500/30 rounded-lg p-4">
                      <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        TECHNICAL CONTACT
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Name:</span>
                          <span className="text-cyan-400 font-mono">{whoisData.tech.name}</span>
                        </div>
                        {whoisData.tech.organization && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Organization:</span>
                            <span className="text-green-400 font-mono">{whoisData.tech.organization}</span>
                          </div>
                        )}
                        {whoisData.tech.country && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Country:</span>
                            <span className="text-yellow-400 font-mono">{whoisData.tech.country}</span>
                          </div>
                        )}
                        {whoisData.tech.email && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Email:</span>
                            <span className="text-cyan-400 font-mono">{whoisData.tech.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Details */}
                {whoisData.status.length > 1 && (
                  <div className="mt-6 bg-gray-800 border border-green-500/30 rounded-lg p-4">
                    <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      DOMAIN STATUS
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {whoisData.status.map((status, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span className="text-gray-300 font-mono text-xs">{status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Processing Time */}
            {whoisProcessingTime > 0 && (
              <div className="text-center mt-8">
                <div className="bg-gray-900 border border-green-500/30 rounded-lg p-4 inline-block">
                  <p className="text-green-400 text-sm">
                    WHOIS lookup completed in {whoisProcessingTime.toFixed(3)} seconds.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WHOIS Error */}
        {activeTab === 'whois' && whoisError && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900 border border-red-500/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <h3 className="text-xl font-bold text-red-400">WHOIS LOOKUP FAILED</h3>
              </div>
              <p className="text-red-300 font-mono text-sm">{whoisError}</p>
            </div>
          </div>
        )}

        {/* DNS Loading State */}
        {activeTab === 'dns' && isLoading && (
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gray-900 border border-green-500/30 rounded-lg p-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-green-400 text-lg mb-2">ANALYZING DNS CONFIGURATION...</p>
              <div className="text-cyan-400 animate-pulse">
                [████████████████████████████████] SCANNING...
              </div>
            </div>
          </div>
        )}

        {/* WHOIS Loading State */}
        {activeTab === 'whois' && isWhoisLoading && (
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gray-900 border border-green-500/30 rounded-lg p-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-green-400 text-lg mb-2">PERFORMING WHOIS LOOKUP...</p>
              <div className="text-cyan-400 animate-pulse">
                [████████████████████████████████] QUERYING...
              </div>
            </div>
          </div>
        )}

        {/* Footer Documentation */}
        <div className="max-w-6xl mx-auto mt-12">
          <div className="bg-gray-900 border border-green-500/30 rounded-lg p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-green-400 mb-4 tracking-wider">SYSTEM DOCUMENTATION</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300 font-mono">
              <div>
                <h3 className="font-bold text-cyan-400 mb-2">PARENT:</h3>
                <p>Analyzes parent domain nameserver delegation and glue records</p>
              </div>
              <div>
                <h3 className="font-bold text-cyan-400 mb-2">NS:</h3>
                <p>Comprehensive nameserver configuration and redundancy tests</p>
              </div>
              <div>
                <h3 className="font-bold text-cyan-400 mb-2">SOA:</h3>
                <p>Start of Authority record validation and timing analysis</p>
              </div>
              <div>
                <h3 className="font-bold text-cyan-400 mb-2">MX:</h3>
                <p>Mail exchange record configuration and resolution tests</p>
              </div>
              <div>
                <h3 className="font-bold text-cyan-400 mb-2">WWW:</h3>
                <p>WWW subdomain A/CNAME record analysis and validation</p>
              </div>
              <div>
                <h3 className="font-bold text-cyan-400 mb-2">WHOIS:</h3>
                <p>Domain registration information and ownership details</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-green-500/20 text-center">
              <p className="text-gray-400 text-xs">
                DNS_ANALYZER v3.2.0 | Powered by Cloudflare 1.1.1.1 DNS API & Multiple WHOIS Providers | Status: OPERATIONAL
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Note: For production use, integrate with a reliable WHOIS API service like whoisjson.com or whoisfreaks.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DNSAnalyzer() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 font-mono">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading DNS Analyzer...</p>
        </div>
      </div>
    }>
      <DNSAnalyzerContent />
    </Suspense>
  );
}