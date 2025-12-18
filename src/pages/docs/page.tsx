import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Copy, CheckCircle2, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import Logo from "@/components/logo.tsx";
import { Link } from "react-router-dom";

export default function PublicApiDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  const apiBaseUrl = "https://api.sayele.co";

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-8">
            <Logo size="sm" showText={true} />
            <nav className="hidden md:flex items-center gap-6">
              <a href="#overview" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Overview
              </a>
              <a href="#authentication" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Authentication
              </a>
              <a href="#endpoints" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Endpoints
              </a>
              <a href="#examples" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Examples
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://sayele.co"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-semibold text-primary">SAYELE</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link to="/dashboard">
              <Button variant="default" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-card to-background py-16">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">SAYELE Messaging API</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Send SMS, WhatsApp, Telegram, and Facebook Messenger messages at scale with our powerful API
            </p>
            <div className="flex items-center justify-center gap-3 pt-4">
              <Badge variant="secondary" className="text-sm">Multi-Channel</Badge>
              <Badge variant="secondary" className="text-sm">Reliable</Badge>
              <Badge variant="secondary" className="text-sm">Easy Integration</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 max-w-7xl space-y-8">
        {/* Overview */}
        <section id="overview">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Everything you need to integrate SAYELE messaging into your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                  <code className="flex-1">{apiBaseUrl}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(apiBaseUrl, "base-url")}
                  >
                    {copiedSection === "base-url" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">1. Get Your API Key</h4>
                  <p className="text-sm text-muted-foreground">
                    Sign in to your dashboard and generate an API key from the API Keys section
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">2. Make Your First Request</h4>
                  <p className="text-sm text-muted-foreground">
                    Use your API key to authenticate and send your first message via our API
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">3. Choose Your Channel</h4>
                  <p className="text-sm text-muted-foreground">
                    Send messages via SMS, WhatsApp, Telegram, or Facebook Messenger
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">4. Track Delivery</h4>
                  <p className="text-sm text-muted-foreground">
                    Monitor message status and receive delivery webhooks in real-time
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Authentication */}
        <section id="authentication">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Secure your API requests with Bearer token authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  All API requests must include your API key in the Authorization header:
                </p>
                <div className="relative">
                  <pre className="p-4 bg-muted rounded-lg font-mono text-sm overflow-x-auto">
                    <code>Authorization: Bearer YOUR_API_KEY</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard("Authorization: Bearer YOUR_API_KEY", "auth-header")}
                  >
                    {copiedSection === "auth-header" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-sm">
                  <strong className="text-blue-600 dark:text-blue-400">Important:</strong> Keep your API key secret. 
                  Never expose it in client-side code or public repositories.
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Endpoints */}
        <section id="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>Available endpoints for sending and tracking messages</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="send" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="send">Send Message</TabsTrigger>
                  <TabsTrigger value="status">Check Status</TabsTrigger>
                </TabsList>

                {/* Send Message */}
                <TabsContent value="send" className="space-y-6 pt-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-green-500 hover:bg-green-500">POST</Badge>
                      <code className="text-sm">/api/v1/sms/send</code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send a message via SMS, WhatsApp, Telegram, or Facebook Messenger
                    </p>
                  </div>

                  {/* Request Parameters */}
                  <div>
                    <h3 className="font-semibold mb-3">Request Body Parameters</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[140px_100px_1fr] gap-4 p-3 bg-muted/50 text-sm font-medium">
                        <div>Parameter</div>
                        <div>Type</div>
                        <div>Description</div>
                      </div>
                      {[
                        { name: "to", type: "string", desc: "Recipient phone number in E.164 format (e.g., +1234567890)", required: true },
                        { name: "message", type: "string", desc: "The message content to send", required: true },
                        { name: "channel", type: "string", desc: "'sms', 'whatsapp', 'telegram', or 'facebook_messenger' (default: 'sms')", required: false },
                        { name: "from", type: "string", desc: "Sender ID (optional, uses client default if not provided)", required: false },
                        { name: "scheduledAt", type: "number", desc: "Unix timestamp in milliseconds for scheduled delivery", required: false },
                      ].map((param) => (
                        <div key={param.name} className="grid grid-cols-[140px_100px_1fr] gap-4 p-3 border-t text-sm">
                          <div>
                            <code className="text-primary font-medium">{param.name}</code>
                            {param.required && <span className="text-red-500 ml-1">*</span>}
                          </div>
                          <div className="text-muted-foreground">{param.type}</div>
                          <div className="text-muted-foreground">{param.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Response */}
                  <div>
                    <h3 className="font-semibold mb-3">Success Response (200)</h3>
                    <div className="relative">
                      <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                        <code>{`{
  "success": true,
  "messageId": "j123abc456def789",
  "status": "pending"
}`}</code>
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                {/* Check Status */}
                <TabsContent value="status" className="space-y-6 pt-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-blue-500 hover:bg-blue-500">GET</Badge>
                      <code className="text-sm">/api/v1/sms/status/:messageId</code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Check the delivery status of a sent message
                    </p>
                  </div>

                  {/* Example */}
                  <div>
                    <h3 className="font-semibold mb-3">Example Request</h3>
                    <div className="relative">
                      <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                        <code>{`curl -X GET ${apiBaseUrl}/api/v1/sms/status/j123abc456def789 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(`curl -X GET ${apiBaseUrl}/api/v1/sms/status/j123abc456def789 \\
  -H "Authorization: Bearer YOUR_API_KEY"`, "status-example")}
                      >
                        {copiedSection === "status-example" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Response */}
                  <div>
                    <h3 className="font-semibold mb-3">Success Response (200)</h3>
                    <div className="p-4 bg-muted rounded-lg">
                      <pre className="text-sm overflow-x-auto">
                        <code>{`{
  "_id": "j123abc456def789",
  "to": "+1234567890",
  "message": "Hello from SAYELE!",
  "status": "delivered",
  "channel": "sms",
  "createdAt": 1699999999999,
  "deliveredAt": 1700000001234
}`}</code>
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* Code Examples */}
        <section id="examples">
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
              <CardDescription>Integration examples in popular programming languages</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="curl" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="php">PHP</TabsTrigger>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>

                <TabsContent value="curl" className="pt-4">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                      <code>{`curl -X POST ${apiBaseUrl}/api/v1/sms/send \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "to": "+1234567890",
    "message": "Hello from SAYELE!",
    "channel": "sms"
  }'`}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(`curl -X POST ${apiBaseUrl}/api/v1/sms/send \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "to": "+1234567890",
    "message": "Hello from SAYELE!",
    "channel": "sms"
  }'`, "curl-example")}
                    >
                      {copiedSection === "curl-example" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="php" className="pt-4">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                      <code>{`<?php
$apiKey = 'YOUR_API_KEY';
$url = '${apiBaseUrl}/api/v1/sms/send';

$data = [
    'to' => '+1234567890',
    'message' => 'Hello from SAYELE!',
    'channel' => 'sms'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    echo "Message sent! ID: " . $result['messageId'];
} else {
    echo "Error: " . $response;
}
?>`}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(`<?php
$apiKey = 'YOUR_API_KEY';
$url = '${apiBaseUrl}/api/v1/sms/send';

$data = [
    'to' => '+1234567890',
    'message' => 'Hello from SAYELE!',
    'channel' => 'sms'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    echo "Message sent! ID: " . $result['messageId'];
} else {
    echo "Error: " . $response;
}
?>`, "php-example")}
                    >
                      {copiedSection === "php-example" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="javascript" className="pt-4">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                      <code>{`const apiKey = 'YOUR_API_KEY';
const url = '${apiBaseUrl}/api/v1/sms/send';

const data = {
  to: '+1234567890',
  message: 'Hello from SAYELE!',
  channel: 'sms'
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${apiKey}\`
  },
  body: JSON.stringify(data)
})
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('Message sent! ID:', result.messageId);
    } else {
      console.error('Error:', result.error);
    }
  })
  .catch(error => console.error('Request failed:', error));`}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(`const apiKey = 'YOUR_API_KEY';
const url = '${apiBaseUrl}/api/v1/sms/send';

const data = {
  to: '+1234567890',
  message: 'Hello from SAYELE!',
  channel: 'sms'
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${apiKey}\`
  },
  body: JSON.stringify(data)
})
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('Message sent! ID:', result.messageId);
    } else {
      console.error('Error:', result.error);
    }
  })
  .catch(error => console.error('Request failed:', error));`, "js-example")}
                    >
                      {copiedSection === "js-example" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="python" className="pt-4">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                      <code>{`import requests

api_key = 'YOUR_API_KEY'
url = '${apiBaseUrl}/api/v1/sms/send'

data = {
    'to': '+1234567890',
    'message': 'Hello from SAYELE!',
    'channel': 'sms'
}

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {api_key}'
}

response = requests.post(url, headers=headers, json=data)

if response.status_code == 200:
    result = response.json()
    print(f"Message sent! ID: {result['messageId']}")
else:
    print(f"Error: {response.text}")`}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(`import requests

api_key = 'YOUR_API_KEY'
url = '${apiBaseUrl}/api/v1/sms/send'

data = {
    'to': '+1234567890',
    'message': 'Hello from SAYELE!',
    'channel': 'sms'
}

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {api_key}'
}

response = requests.post(url, headers=headers, json=data)

if response.status_code == 200:
    result = response.json()
    print(f"Message sent! ID: {result['messageId']}")
else:
    print(f"Error: {response.text}")`, "python-example")}
                    >
                      {copiedSection === "python-example" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* Status Codes */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Response Codes</CardTitle>
              <CardDescription>HTTP status codes and message delivery states</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">HTTP Status Codes</h3>
                  <div className="space-y-2">
                    {[
                      { code: 200, desc: "Success - Request completed" },
                      { code: 400, desc: "Bad Request - Invalid parameters" },
                      { code: 401, desc: "Unauthorized - Invalid API key" },
                      { code: 403, desc: "Forbidden - Insufficient credits" },
                      { code: 404, desc: "Not Found - Resource not found" },
                      { code: 500, desc: "Server Error - Internal error" },
                    ].map((item) => (
                      <div key={item.code} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Badge variant="outline" className="font-mono shrink-0">{item.code}</Badge>
                        <span className="text-sm text-muted-foreground">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Message Status</h3>
                  <div className="space-y-2">
                    {[
                      { status: "pending", desc: "Queued for sending", color: "bg-yellow-500" },
                      { status: "sent", desc: "Sent to provider", color: "bg-blue-500" },
                      { status: "delivered", desc: "Successfully delivered", color: "bg-green-500" },
                      { status: "failed", desc: "Delivery failed", color: "bg-red-500" },
                      { status: "scheduled", desc: "Scheduled for future", color: "bg-purple-500" },
                    ].map((item) => (
                      <div key={item.status} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className={`h-2 w-2 rounded-full ${item.color} shrink-0`} />
                        <code className="text-sm font-medium">{item.status}</code>
                        <span className="text-sm text-muted-foreground">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-card">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Developed by</span>
              <a
                href="https://sayele.co"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                SAYELE
              </a>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <a
                href="https://sayele.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Website
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
