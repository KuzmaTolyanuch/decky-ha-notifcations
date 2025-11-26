import {
  definePlugin,
  ServerAPI,
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  staticClasses,
  toaster,
} from "decky-frontend-lib";
import { VFC, useState, useEffect } from "react";
import { FaBell } from "react-icons/fa";

interface Notification {
  title: string;
  message: string;
  timestamp: number;
}

interface PluginStats {
  port: number;
  status: string;
  pending_notifications: number;
}

const Content: VFC<{ serverAPI: ServerAPI }> = ({ serverAPI }) => {
  const [port, setPort] = useState<number>(8888);
  const [stats, setStats] = useState<PluginStats | null>(null);

  useEffect(() => {
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

  const showNotification = (title: string, message: string) => {
    // THIS IS THE KEY PART - Shows notification in Gaming Mode
    toaster.toast({
      title: title,
      body: message,
      duration: 8000,
      critical: true,
      showCloseButton: true,
      icon: <FaBell />,
    });
  };

  const testNotification = () => {
    showNotification("Test Notification", "This is a test from HA Notify plugin!");
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
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Pending:</span>
            <span>{stats?.pending_notifications || 0}</span>
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Test">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={testNotification}>
            Send Test Notification
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Usage">
        <PanelSectionRow>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>
            <p>Send from Home Assistant:</p>
            <code style={{ 
              display: "block", 
              padding: "10px", 
              background: "#1a1a1a", 
              borderRadius: "5px", 
              marginTop: "10px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all"
            }}>
              curl -X POST http://steamdeck:{port}/notify{"\n"}
              -H "Content-Type: application/json"{"\n"}
              -d '{`{"title":"Alert","message":"Test"}`}'
            </code>
          </div>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  let pollInterval: NodeJS.Timeout;

  // Poll for new notifications every second
  const pollForNotifications = async () => {
    try {
      const result = await serverApi.callPluginMethod<{}, Notification[]>(
        "get_pending_notifications",
        {}
      );

      if (result.success && result.result && result.result.length > 0) {
        const notifications = result.result;
        
        // Display each notification
        notifications.forEach((notif: Notification) => {
          toaster.toast({
            title: notif.title,
            body: notif.message,
            duration: 8000,
            critical: true,
            showCloseButton: true,
            icon: <FaBell />,
          });
        });
      }
    } catch (error) {
      console.error("Error polling notifications:", error);
    }
  };

  // Start polling
  pollInterval = setInterval(pollForNotifications, 1000);

  return {
    title: <div className={staticClasses.Title}>HA Notify</div>,
    content: <Content serverAPI={serverApi} />,
    icon: <FaBell />,
    onDismount() {
      clearInterval(pollInterval);
    },
  };
});