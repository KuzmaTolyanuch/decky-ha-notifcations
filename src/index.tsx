import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses
} from "@decky/ui";

import {
  callable,
  definePlugin,
  toaster,
} from "@decky/api";

import { useState, useEffect } from "react";
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

const getStats = callable<[], PluginStats>("get_stats");
const getPendingNotifications = callable<[], Notification[]>("get_pending_notifications");

const Content = () => {
  const [stats, setStats] = useState<PluginStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await getStats();
      setStats(result);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const testNotification = () => {
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
            <span>{stats?.port || 8888}</span>
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
          <ButtonItem layout="below" onClick={testNotification}>
            Send Test Notification
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Usage">
        <PanelSectionRow>
          <div style={{ fontSize: "11px", opacity: 0.7, lineHeight: "1.4" }}>
            <p style={{ marginBottom: "8px" }}>From Home Assistant:</p>
            <code style={{
              display: "block",
              padding: "8px",
              background: "#1a1a1a",
              borderRadius: "4px",
              fontSize: "10px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all"
            }}>
              curl -X POST http://steamdeck:{stats?.port || 8888}/notify{'\n'}
              -H "Content-Type: application/json"{'\n'}
              -d '{`{"title":"Alert","message":"Test"}`}'
            </code>
          </div>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default definePlugin(() => {
  console.log("HA Notify initializing");

  let pollInterval: number | undefined;

  const checkForNotifications = async () => {
    try {
      const notifications = await getPendingNotifications();

      if (notifications && notifications.length > 0) {
        notifications.forEach((notif: Notification) => {
          toaster.toast({
            title: notif.title,
            body: notif.message,
            duration: 8000,
          });
        });
      }
    } catch (error) {
      // Silently handle
    }
  };

  pollInterval = window.setInterval(checkForNotifications, 1000);

  return {
    name: "HA Notify",
    titleView: <div className={staticClasses.Title}>HA Notify</div>,
    content: <Content />,
    icon: <FaBell />,
    onDismount() {
      console.log("HA Notify unloading");
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    },
  };
});
