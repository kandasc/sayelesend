import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function ApiDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  const apiBaseUrl = "https://api.sayele.co";

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground mt-1">
            Complete guide to integrating SAYELE messaging API
          </p>
        </div>
        <a
          href="https://sayele.co"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Powered by <span className="font-semibold text-primary">SAYELE</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Base URL */}
      <Card>
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
          <CardDescription>All API requests should be made to this base URL</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>Authenticate your API requests using Bearer tokens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              All requests must include your API key in the Authorization header:
            </p>
            <div className="p-3 bg-muted rounded-lg font-mono text-sm">
              <code>Authorization: Bearer YOUR_API_KEY</code>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-sm">
              <strong className="text-blue-600 dark:text-blue-400">Note:</strong> Get your API key from the{" "}
              <a href="/api-keys" className="underline hover:no-underline">API Keys</a> page
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="send">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="send">Send Message</TabsTrigger>
              <TabsTrigger value="status">Check Status</TabsTrigger>
            </TabsList>

            {/* Send Message */}
            <TabsContent value="send" className="space-y-6">
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
                <h3 className="font-semibold mb-3">Request Body</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <div className="font-medium">Parameter</div>
                    <div className="font-medium">Type</div>
                    <div className="font-medium">Description</div>
                  </div>
                  {[
                    { name: "to", type: "string", desc: "Recipient phone number (E.164 format: +1234567890)", required: true },
                    { name: "message", type: "string", desc: "Message content to send", required: true },
                    { name: "channel", type: "string", desc: "Channel: 'sms', 'whatsapp', 'telegram', 'facebook_messenger' (default: 'sms')", required: false },
                    { name: "from", type: "string", desc: "Sender ID (optional, uses client default if not provided)", required: false },
                    { name: "scheduledAt", type: "number", desc: "Unix timestamp in milliseconds for scheduled delivery", required: false },
                  ].map((param) => (
                    <div key={param.name} className="grid grid-cols-3 gap-4 p-3 border-b text-sm">
                      <div>
                        <code className="text-primary">{param.name}</code>
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      <div className="text-muted-foreground">{param.type}</div>
                      <div className="text-muted-foreground">{param.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Examples */}
              <div>
                <h3 className="font-semibold mb-3">Code Examples</h3>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="php">PHP</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>

                  <TabsContent value="curl">
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
  }'`, "curl")}
                      >
                        {copiedSection === "curl" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="php">
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
?>`, "php")}
                      >
                        {copiedSection === "php" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="javascript">
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
  .catch(error => console.error('Request failed:', error));`, "javascript")}
                      >
                        {copiedSection === "javascript" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="python">
                    <div className="relative">
                      <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                        <code>{`import requests
import json

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
import json

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
    print(f"Error: {response.text}")`, "python")}
                      >
                        {copiedSection === "python" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Response */}
              <div>
                <h3 className="font-semibold mb-3">Success Response</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="text-sm overflow-x-auto">
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
            <TabsContent value="status" className="space-y-6">
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
  -H "Authorization: Bearer YOUR_API_KEY"`, "status-curl")}
                  >
                    {copiedSection === "status-curl" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Response */}
              <div>
                <h3 className="font-semibold mb-3">Response</h3>
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

      {/* Status Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Status Codes</CardTitle>
          <CardDescription>Message delivery status values</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { status: "pending", desc: "Message queued for sending", color: "bg-yellow-500" },
              { status: "sent", desc: "Message sent to provider", color: "bg-blue-500" },
              { status: "delivered", desc: "Message successfully delivered", color: "bg-green-500" },
              { status: "failed", desc: "Message delivery failed", color: "bg-red-500" },
              { status: "scheduled", desc: "Message scheduled for future delivery", color: "bg-purple-500" },
            ].map((item) => (
              <div key={item.status} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`h-2 w-2 rounded-full ${item.color}`} />
                <code className="text-sm font-medium">{item.status}</code>
                <span className="text-sm text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Error Codes</CardTitle>
          <CardDescription>HTTP status codes and error responses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { code: 200, desc: "Success - Request completed successfully" },
              { code: 400, desc: "Bad Request - Missing or invalid parameters" },
              { code: 401, desc: "Unauthorized - Invalid or missing API key" },
              { code: 403, desc: "Forbidden - Insufficient credits or permissions" },
              { code: 404, desc: "Not Found - Resource does not exist" },
              { code: 500, desc: "Server Error - Internal server or provider error" },
            ].map((item) => (
              <div key={item.code} className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge variant="outline" className="font-mono">{item.code}</Badge>
                <span className="text-sm text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Multi-Channel Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Channel Messaging</CardTitle>
          <CardDescription>Send messages across different channels</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sms" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="telegram">Telegram</TabsTrigger>
              <TabsTrigger value="messenger">Messenger</TabsTrigger>
            </TabsList>

            {[
              { id: "sms", channel: "sms", name: "SMS" },
              { id: "whatsapp", channel: "whatsapp", name: "WhatsApp" },
              { id: "telegram", channel: "telegram", name: "Telegram" },
              { id: "messenger", channel: "facebook_messenger", name: "Facebook Messenger" },
            ].map((item) => (
              <TabsContent key={item.id} value={item.id}>
                <div className="relative">
                  <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                    <code>{`{
  "to": "+1234567890",
  "message": "Hello from SAYELE via ${item.name}!",
  "channel": "${item.channel}"
}`}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(`{
  "to": "+1234567890",
  "message": "Hello from SAYELE via ${item.name}!",
  "channel": "${item.channel}"
}`, `channel-${item.id}`)}
                  >
                    {copiedSection === `channel-${item.id}` ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Get support from the SAYELE team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Website:</span>
            <a
              href="https://sayele.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              sayele.co
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">API Keys:</span>
            <a href="/api-keys" className="text-sm text-primary hover:underline">
              Manage your API keys
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
