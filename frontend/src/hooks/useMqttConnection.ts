import { useEffect, useState, useRef } from "react";
import mqtt from "mqtt";

interface MqttData {
  ain0?: number;
  voltage?: number;
  nh3?: number;
  aqi?: number;
  co2?: number;
  temp?: number;
  runtime?: number;
  timestamp?: number;
  [key: string]: any;
}

export function useMqttConnection(autoConnect = false) {
  const [data, setData] = useState<MqttData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const clientRef = useRef<any>(null);

  const connect = async (brokerUrl = "ws://localhost:9001") => {
    if (clientRef.current) return;
    setIsConnecting(true);
    try {
      const client = mqtt.connect(brokerUrl);
      clientRef.current = client;
      client.on("connect", () => {
        setIsConnected(true);
        setIsConnecting(false);
        client.subscribe("ecotronics/live");
      });
      client.on("message", (topic, message) => {
        try {
          const parsed = JSON.parse(message.toString());
          setData({ ...parsed, timestamp: Date.now() });
        } catch (e) {}
      });
      client.on("error", (err) => {
        console.error("MQTT Error:", err);
        setIsConnected(false);
        setIsConnecting(false);
      });
    } catch (e) {
      console.error("MQTT Connect Error:", e);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (clientRef.current) {
      clientRef.current.end();
      clientRef.current = null;
      setIsConnected(false);
      setData(null);
    }
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => disconnect();
  }, [autoConnect]);

  return { isConnected, isConnecting, data, connect, disconnect };
}
