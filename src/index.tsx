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
import { resolveNotificationIcon } from "./notificationIcon";

interface Notification {
  title: string;
  message: string;
  timestamp: number;
  command?: string;
  expiration?: number; // Milliseconds before removal from the Steam notification tray
  action?: string;  // Optional action URL or command
  icon?: string;    // Optional mdi:<icon_name> from Home Assistant
  icon_color?: string; // Optional CSS color like "red" or "#41BDF5"
  color?: string;   // Optional alias for compatibility
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
const DEFAULT_TOAST_EXPIRATION_MS = 24 * 60 * 60 * 1000;
type ToastHandle = ReturnType<typeof toaster.toast>;

const activeToastHandles = new Map<ToastHandle, number>();

interface DashboardBrowserView {
  EnableSteamInput(): void;
  SetBounds(x: number, y: number, width: number, height: number): void;
  SetWindowStackingOrder(order: number): void;
  SetVisible(visible: boolean): void;
  SetFocus(focused: boolean): void;
}

interface SteamBrowserApi {
  BrowserView: {
    Create(options?: { strInitialURL?: string }): DashboardBrowserView;
    Destroy(browserView: DashboardBrowserView): void;
  };
  Window: {
    GetDefaultMonitorDimensions(): Promise<{
      nFullLeft: number;
      nFullTop: number;
      nFullWidth: number;
      nFullHeight: number;
    }>;
  };
}

const getSteamBrowserApi = (): SteamBrowserApi => {
  const steamClient = (window as unknown as { SteamClient?: SteamBrowserApi }).SteamClient;
  if (!steamClient?.BrowserView || !steamClient?.Window) {
    throw new Error("Steam BrowserView API is unavailable");
  }
  return steamClient;
};

type DashboardBrowserViewHandle = ReturnType<SteamBrowserApi["BrowserView"]["Create"]>;

let dashboardBrowserView: DashboardBrowserViewHandle | null = null;

const showTrackedToast = (toastData: Parameters<typeof toaster.toast>[0]) => {
  const expiration = typeof toastData.expiration === "number" && Number.isFinite(toastData.expiration) && toastData.expiration > 0
    ? toastData.expiration
    : DEFAULT_TOAST_EXPIRATION_MS;
  const toastHandle = toaster.toast({ ...toastData, expiration });
  const cleanupTimer = window.setTimeout(() => {
    activeToastHandles.delete(toastHandle);
  }, expiration);
  activeToastHandles.set(toastHandle, cleanupTimer);
  return toastHandle;
};

const dismissAllPluginToasts = () => {
  activeToastHandles.forEach((timer, toastHandle) => {
    window.clearTimeout(timer);
    toastHandle.dismiss();
  });
  activeToastHandles.clear();
};

// Main content component
const Content = ({
  onDismissAll,
  onOpenFullscreenDashboard,
  onCloseFullscreenDashboard,
}: {
  onDismissAll: () => void;
  onOpenFullscreenDashboard: () => Promise<boolean>;
  onCloseFullscreenDashboard: () => void;
}) => {
  const [stats, setStats] = useState<PluginStats | null>(null);
  const [testing, setTesting] = useState(false);
  const [fullscreenDashboardOpen, setFullscreenDashboardOpen] = useState(false);

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

  const openFullscreenDashboard = async () => {
    setFullscreenDashboardOpen(await onOpenFullscreenDashboard());
  };

  const closeFullscreenDashboard = () => {
    onCloseFullscreenDashboard();
    setFullscreenDashboardOpen(false);
  };

  const testNotification = () => {
    const iconPath = resolveNotificationIcon("mdi:home-assistant");

    showTrackedToast({
      title: "Test Notification",
      body: "This is a test from HA Notify!",
      duration: 5000,
      logo: iconPath ? (
        <svg
          width={40}
          height={40}
          viewBox="0 0 24 24"
          color="#41BDF5"
          style={{ flexShrink: 0 }}
          aria-hidden="true"
        >
          <path d={iconPath} fill="currentColor" />
        </svg>
      ) : null,
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
        showTrackedToast({
          title: "Error",
          body: "Failed to get dashboard URL",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Failed to open dashboard:", error);
      showTrackedToast({
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
      const iconPath = resolveNotificationIcon("mdi:home-assistant");

      showTrackedToast({
        title: result.connected ? "Connected" : "Connection Failed",
        body: result.message,
        duration: 5000,
        logo: iconPath ? (
          <svg
            width={40}
            height={40}
            viewBox="0 0 24 24"
            color={result.connected ? "#4caf50" : "#f44336"}
            style={{ flexShrink: 0 }}
            aria-hidden="true"
          >
            <path d={iconPath} fill="currentColor" />
          </svg>
        ) : null,
      });
    } catch (error) {
      showTrackedToast({
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
          <ButtonItem layout="below" onClick={openFullscreenDashboard}>
            Open Dashboard Fullscreen (Experimental)
          </ButtonItem>
        </PanelSectionRow>
        {fullscreenDashboardOpen && (
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={closeFullscreenDashboard}>
              Close Fullscreen Dashboard
            </ButtonItem>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <div style={{ fontSize: "10px", opacity: 0.6, lineHeight: "1.3" }}>
            Fullscreen mode hides Steam's browser toolbar. Press the Steam button to reopen Decky, then choose Close Fullscreen Dashboard.
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
            <ButtonItem layout="below" onClick={onDismissAll}>
              Dismiss All Notifications
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
              {'  '}icon: "mdi:map-marker-question-outline"{'\n'}
              {'  '}icon_color: "lightblue"{'\n'}
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

  const closeFullscreenDashboard = () => {
    if (dashboardBrowserView) {
      try {
        getSteamBrowserApi().BrowserView.Destroy(dashboardBrowserView);
      } catch (error) {
        console.error("Failed to close fullscreen dashboard browser:", error);
        dashboardBrowserView.SetVisible(false);
      }
      dashboardBrowserView = null;
    }
  };

  const openFullscreenDashboard = async () => {
    try {
      const url = await getDashboardUrl();
      if (!url) {
        throw new Error("Failed to get dashboard URL");
      }

      closeFullscreenDashboard();
      const steamClient = getSteamBrowserApi();
      const monitor = await steamClient.Window.GetDefaultMonitorDimensions();
      const browserView = steamClient.BrowserView.Create({ strInitialURL: url });
      dashboardBrowserView = browserView;
      browserView.SetBounds(
        monitor.nFullLeft,
        monitor.nFullTop,
        monitor.nFullWidth,
        monitor.nFullHeight,
      );
      browserView.SetWindowStackingOrder(1); // Steam's EWindowStackingOrder.Top
      browserView.SetVisible(true);
      browserView.EnableSteamInput();
      browserView.SetFocus(true);
      return true;
    } catch (error) {
      closeFullscreenDashboard();
      console.error("Failed to open fullscreen dashboard:", error);
      showTrackedToast({
        title: "Fullscreen browser unavailable",
        body: "Use Open Dashboard to open HA in Steam's standard browser.",
        duration: 6000,
      });
      return false;
    }
  };

  const checkForNotifications = async () => {
    try {
      const notifications = await getPendingNotifications();

      if (notifications && notifications.length > 0) {
        notifications.forEach((notif: Notification) => {
          if (notif.command === "dismiss_all") {
            dismissAllPluginToasts();
            return;
          }

          const iconPath = resolveNotificationIcon(notif.icon) ?? resolveNotificationIcon("mdi:home-assistant");
          const iconColor = notif.icon_color || notif.color || "#41BDF5";
          const expiration = typeof notif.expiration === "number" && Number.isFinite(notif.expiration) && notif.expiration > 0
            ? notif.expiration
            : DEFAULT_TOAST_EXPIRATION_MS;
          showTrackedToast({
            title: notif.title,
            body: notif.message,
            duration: 8000,
            expiration,
            logo: iconPath ? (
              <svg
                width={40}
                height={40}
                viewBox="0 0 24 24"
                color={iconColor}
                style={{ flexShrink: 0 }}
                aria-hidden="true"
              >
                <path d={iconPath} fill="currentColor" />
              </svg>
            ) : null,
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
    content: (
      <Content
        onDismissAll={dismissAllPluginToasts}
        onOpenFullscreenDashboard={openFullscreenDashboard}
        onCloseFullscreenDashboard={closeFullscreenDashboard}
      />
    ),
    icon: <FaBell />,
    alwaysRender: true,
    onDismount() {
      console.log("HA Notify unloading");
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      closeFullscreenDashboard();
      dismissAllPluginToasts();
    },
  };
});
