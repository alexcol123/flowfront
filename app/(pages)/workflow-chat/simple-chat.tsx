"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SimpleChatProps {
  webhookId?: string;
}

export default function SimpleChat({ webhookId }: SimpleChatProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant", content: string }>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !webhookUrl) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/n8n/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookUrl,
          message: userMessage,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.response) {
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.error || "Failed to get response. Please check your webhook URL and try again." 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Error connecting to the webhook. Please check your connection and try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Chat Interface</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook URL Input */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="block text-sm font-medium text-blue-900 mb-2">
            n8n Webhook URL
          </label>
          <Input
            type="url"
            placeholder={webhookId ? 
              `https://your-instance.n8n.cloud/webhook/${webhookId}` : 
              "https://your-instance.n8n.cloud/webhook/..."
            }
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-blue-700 mt-1">
            Enter the webhook URL from your n8n workflow to send chat messages
          </p>
        </div>

        {/* Chat Messages */}
        <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center">No messages yet. Start a conversation!</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded ${
                    msg.role === "user" 
                      ? "bg-blue-100 ml-auto max-w-[70%]" 
                      : "bg-white max-w-[70%]"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
            disabled={isLoading || !webhookUrl}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !webhookUrl || !inputMessage.trim()}
          >
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>

        {!webhookUrl && (
          <p className="text-xs text-orange-600 text-center">
            ⚠️ Please enter a webhook URL above to start chatting
          </p>
        )}
      </CardContent>
    </Card>
  );
}