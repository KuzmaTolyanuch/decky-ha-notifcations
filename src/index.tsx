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

const PluginPanel: VFC<{ serverAPI: ServerAPI }> = ({ serverAPI }) => {
  const [serverPort, setServerPort] = useState<number>(8888);

  useEffect(() => {
    fetchServerStatus();
  }, []);

  const fetchServerStatus = async () => {
    const portResult = await serverAPI.callPluginMethod("get_server_port", {});
    if (portResult.success) {
      setServerPort(portResult.result as number);
    }
  };

  const showNotification = (title: string, message: string) => {
    // KEY PART - This actually shows the notification in Gaming Mode
    toaster.toast({
      title: title,
      body: message,
      duration: 8000,
      critical: true,
      showCloseButton: true,
    });
  };

  const testMessage = () => {
    showNotification("Test Alert", "This is a test notification!");
  };

  return (
    <PanelSection title="HA Notify">
      <PanelSectionRow>
        <span>Listening on port: {serverPort}</span>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={testMessage}>
          Test Notification
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  // Poll for new notifications every second
  const pollForNotifications = async () => {
    const result = await serverApi.callPluginMethod<{}, Notification[]>(
      "get_pending_notifications",
      {}
    );
    
    if (result.success && result.result) {
      const notifications = result.result;
      notifications.forEach((notif: Notification) => {
        // THIS IS WHERE NOTIFICATIONS ACTUALLY APPEAR
        toaster.toast({
          title: notif.title,
          body: notif.message,
          duration: 8000,
          critical: true,
          showCloseButton: true,
        });
      });
    }
  };

  const pollInterval = setInterval(pollForNotifications, 1000);

  return {
    title: <div className={staticClasses.Title}>HA Notify</div>,
    content: <PluginPanel serverAPI={serverApi} />,
    icon: <FaBell />,
    onDismount() {
      clearInterval(pollInterval);
    },
  };
});