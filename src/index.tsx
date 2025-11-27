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
    toaster.toast({
      title: title,
      body: message,
      duration: 8000,
      critical: true,
      showCloseButton: true,
    });
  };

  const testNotification = () => {
    showNotification("Test Notification", "This is a test from HA Notify plugin!");
  };

  return (
    <PanelSection title="Status">
      <PanelSectionRow>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span>Service:</span>
          <span style={{ color: stats?.status === "running" ? "#00ff00" : "#ff0000" }}>
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
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={testNotification}>
          Send Test Notification
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  let pollInterval: NodeJS.Timeout;

  const pollForNotifications = async () => {
    try {
      const result = await serverApi.callPluginMethod<{}, Notification[]>(
        "get_pending_notifications",
        {}
      );

      if (result.success && result.result && result.result.length > 0) {
        const notifications = result.result;
        
        notifications.forEach((notif: Notification) => {
          toaster.toast({
            title: notif.title,
            body: notif.message,
            duration: 8000,
            critical: true,
            showCloseButton: true,
          });
        });
      }
    } catch (error) {
      console.error("Error polling notifications:", error);
    }
  };

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