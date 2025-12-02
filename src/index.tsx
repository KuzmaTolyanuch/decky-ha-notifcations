import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
  Focusable,
  Navigation
} from "@decky/ui";

import {
  callable,
  definePlugin,
  toaster
} from "@decky/api";

import { useState, useEffect } from "react";
import { FaBell, FaSync, FaExternalLinkAlt } from "react-icons/fa";
import { SiHomeassistant } from "react-icons/si";

interface Notification {
  title: string;
  message: string;
  timestamp: number;
  action?: string;  // Optional action URL or command
  entity_id?: string;  // Optional entity to control
}

interface PluginStats {
  status: string;
  pending_notifications: number;
  websocket_status: string;
  ha_url: string;
}

interface ConnectionStatus {
  connected: boolean;
  message: string;
}

const getStats = callable<[], PluginStats>("get_stats");
const getPendingNotifications = callable<[], Notification[]>("get_pending_notifications");
const getDashboardUrl = callable<[], string | null>("get_dashboard_url");
const verifyConnection = callable<[], ConnectionStatus>("verify_connection");

// Main content component
const Content = () => {
  const [stats, setStats] = useState<PluginStats | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
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
      logo: <SiHomeassistant size={32} color="#41BDF5" style={{ marginRight: "10px" }} />,
      onClick: async () => {
        // Open dashboard when clicking test notification
        const url = await getDashboardUrl();
        if (url) {
          Navigation.NavigateToExternalWeb(url);
        }
      }
    });
  };

  const openDashboard = async () => {
    try {
      const url = await getDashboardUrl();
      if (url) {
        Navigation.NavigateToExternalWeb(url);
      } else {
        toaster.toast({
          title: "Error",
          body: "Failed to get dashboard URL",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Failed to open dashboard:", error);
      toaster.toast({
        title: "Error",
        body: "Failed to open dashboard",
        duration: 5000,
      });
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const result = await verifyConnection();
      toaster.toast({
        title: result.connected ? "Connected" : "Connection Failed",
        body: result.message,
        duration: 5000,
        logo: <SiHomeassistant size={32} color={result.connected ? "#4caf50" : "#f44336"} style={{ marginRight: "8px" }} />,
      });
    } catch (error) {
      toaster.toast({
        title: "Error",
        body: "Failed to test connection",
        duration: 5000,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <PanelSection title="Status">
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <span>WebSocket:</span>
            <span style={{ color: stats?.websocket_status === "connected" ? "#0f0" : "#f00" }}>
              {stats?.websocket_status || "Unknown"}
            </span>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <span>HA URL:</span>
            <span style={{ fontSize: "10px", opacity: 0.7 }}>
              {stats?.ha_url || "Not configured"}
            </span>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <span>Pending:</span>
            <span>{stats?.pending_notifications || 0}</span>
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Dashboard">
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={openDashboard}
            icon={<FaExternalLinkAlt />}
          >
            Open Dashboard
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ fontSize: "10px", opacity: 0.6, lineHeight: "1.3" }}>
            Opens in Steam browser. Use right trackpad as mouse.
            Press Steam button → X to close.
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Test">
        <PanelSectionRow>
          <Focusable style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <ButtonItem layout="below" onClick={testNotification}>
              Send Test Notification
            </ButtonItem>
            <ButtonItem 
              layout="below" 
              onClick={testConnection}
              icon={<FaSync />}
              disabled={testing}
            >
              {testing ? "Testing..." : "Test Connection"}
            </ButtonItem>
          </Focusable>
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
              # Basic notification{'\n'}
              event: steamdeck_notify{'\n'}
              data:{'\n'}
              {'  '}title: "Alert"{'\n'}
              {'  '}message: "Test message"{'\n'}
              {'\n'}
              # With action (opens URL){'\n'}
              event: steamdeck_notify{'\n'}
              data:{'\n'}
              {'  '}title: "Door opened"{'\n'}
              {'  '}message: "Front door"{'\n'}
              {'  '}action: "/lovelace/cameras"
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
            logo: <SiHomeassistant size={32} color="#41BDF5" style={{ marginRight: "10px" }} />,
            onClick: async () => {
              // Handle different action types
              if (notif.action) {
                const url = await getDashboardUrl();
                if (url) {
                  // If action is a path, append to HA URL
                  if (notif.action.startsWith('/')) {
                    const baseUrl = url.split('/lovelace')[0];
                    Navigation.NavigateToExternalWeb(`${baseUrl}${notif.action}`);
                  } 
                  // If action is a full URL
                  else if (notif.action.startsWith('http')) {
                    Navigation.NavigateToExternalWeb(notif.action);
                  }
                  // Default: open main dashboard
                  else {
                    Navigation.NavigateToExternalWeb(url);
                  }
                }
              } else {
                // No action specified, open main dashboard
                const url = await getDashboardUrl();
                if (url) {
                  Navigation.NavigateToExternalWeb(url);
                }
              }
            }
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
    alwaysRender: true,
    onDismount() {
      console.log("HA Notify unloading");
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    },
  };
});
