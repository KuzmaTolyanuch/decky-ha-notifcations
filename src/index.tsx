import {
  ButtonItem,
  definePlugin,
  PanelSection,
  PanelSectionRow,
  ServerAPI,
  staticClasses,
  Router,
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

  const testNotification = () => {
    // Show toast notification directly
    toaster.toast({
      title: "Test Notification",
      body: "This is a test from HA Notify!",
      duration: 5000,
    });
  };

  return (
    <>
      <PanelSection title="Status">
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <span>Service:</span>
            <span style={{ color: stats?.status === "running" ? "#0f0" : "#f00" }}>
              {stats?.status || "Unknown"}
            </span>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <span>Port:</span>
            <span>{stats?.port || "N/A"}</span>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <span>Pending:</span>
            <span>{stats?.pending_notifications || 0}</span>
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Test">
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={testNotification}
          >
            Send Test Notification
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Usage">
        <PanelSectionRow>
          <div style={{ fontSize: "11px", opacity: 0.7 }}>
            <p>From Home Assistant:</p>
            <code style={{
              display: "block",
              padding: "8px",
              background: "#1a1a1a",
              borderRadius: "4px",
              marginTop: "8px",
              fontSize: "10px",
            }}>
              curl -X POST http://steamdeck:{port}/notify<br />
              -H "Content-Type: application/json"<br />
              -d '{`{"title":"Alert","message":"Door opened"}`}'
            </code>
          </div>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  let pollInterval: NodeJS.Timer;

  const checkForNotifications = async () => {
    try {
      const result = await serverApi.callPluginMethod<{}, Notification[]>(
        "get_pending_notifications",
        {}
      );

      if (result.success && result.result && result.result.length > 0) {
        result.result.forEach((notif: Notification) => {
          // Show toast notification in Gaming Mode
          toaster.toast({
            title: notif.title,
            body: notif.message,
            duration: 8000,
            critical: false,
          });
        });
      }
    } catch (error) {
      // Silently handle polling errors
    }
  };

  return {
    title: <div className={staticClasses.Title}>HA Notify</div>,
    content: <Content serverAPI={serverApi} />,
    icon: <FaBell />,
    onDismount() {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    },
    async onMount() {
      // Start polling for notifications
      pollInterval = setInterval(checkForNotifications, 1000);
    },
  };
});