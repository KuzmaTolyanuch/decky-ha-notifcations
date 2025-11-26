import {
  definePlugin,
  ServerAPI,
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  staticClasses,
  TextField,
  Focusable,
} from "decky-frontend-lib";
import { VFC, useState, useEffect } from "react";
import { FaBell } from "react-icons/fa";

interface PluginStats {
  port: number;
  status: string;
}

const Content: VFC<{ serverAPI: ServerAPI }> = ({ serverAPI }) => {
  const [port, setPort] = useState<number>(8888);
  const [stats, setStats] = useState<PluginStats | null>(null);
  const [testTitle, setTestTitle] = useState<string>("Test Notification");
  const [testMessage, setTestMessage] = useState<string>("This is a test from Steam Deck");

  useEffect(() => {
    // Load current stats
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await serverAPI.callPluginMethod<{}, PluginStats>(
        "get_stats",
        {}
      );
      if (result.success) {
        setStats(result.result);
        setPort(result.result.port);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handlePortChange = async () => {
    try {
      const result = await serverAPI.callPluginMethod<{ port: number }, boolean>(
        "set_port",
        { port }
      );
      if (result.success) {
        alert(`Port changed to ${port}. Please reload the plugin.`);
      }
    } catch (error) {
      console.error("Failed to change port:", error);
      alert("Failed to change port");
    }
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch(`http://localhost:${port}/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: testTitle,
          message: testMessage,
          duration: 5000,
        }),
      });

      if (response.ok) {
        console.log("Test notification sent successfully");
      } else {
        console.error("Failed to send test notification");
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
    }
  };

  return (
    <div style={{ marginTop: "50px", color: "white" }}>
      <PanelSection title="Status">
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Service Status:</span>
            <span style={{ color: stats?.status === "running" ? "#00ff00" : "#ff0000" }}>
              {stats?.status || "Unknown"}
            </span>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Listening Port:</span>
            <span>{stats?.port || "N/A"}</span>
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Configuration">
        <PanelSectionRow>
          <Focusable style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ minWidth: "30%" }}>Port:</div>
            <TextField
              value={port.toString()}
              onChange={(e) => setPort(parseInt(e.target.value) || 8888)}
            />
          </Focusable>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handlePortChange}>
            Update Port (Requires Reload)
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Test Notification">
        <PanelSectionRow>
          <Focusable style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <TextField
              label="Title"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
            />
            <TextField
              label="Message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </Focusable>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={sendTestNotification}>
            Send Test Notification
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Usage">
        <PanelSectionRow>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>
            <p>Send notifications from Home Assistant:</p>
            <code style={{ display: "block", padding: "10px", background: "#1a1a1a", borderRadius: "5px", marginTop: "10px" }}>
              curl -X POST http://steamdeck:{ port }/notify<br />
              -H "Content-Type: application/json"<br />
              -d '{`{"title":"Alert","message":"Door opened"}`}'
            </code>
          </div>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  return {
    title: <div className={staticClasses.Title}>HA Notify</div>,
    content: <Content serverAPI={serverApi} />,
    icon: <FaBell />,
    onDismount() {
      // Cleanup
    },
  };
});