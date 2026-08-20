import { useState, useEffect } from "react";
import { StreamVideoClient, UserRequest } from "@stream-io/video-react-sdk";
import { StreamChat } from "stream-chat";

export interface StreamUser extends UserRequest {
  id: string;
  name?: string;
  image?: string;
}

interface UseStreamClientsProps {
  apiKey?: string;
  user?: StreamUser;
  token?: string;
}

interface UseStreamClientsReturn {
  videoClient: StreamVideoClient | null;
  chatClient: StreamChat | null;
}

export function useStreamClients({
  apiKey,
  user,
  token,
}: UseStreamClientsProps): UseStreamClientsReturn {
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    if (!apiKey || !user || !token) return;

    let isMounted = true;
    let vClient: StreamVideoClient | null = null;
    let cClient: StreamChat | null = null;

    const initClients = async (): Promise<void> => {
      try {
        const tokenProvider = () => Promise.resolve(token);

        vClient = new StreamVideoClient({
          apiKey,
          user: {
            id: user.id,
            name: user.name,
            image: user.image,
            type: "authenticated",
          },
          tokenProvider,
        });

        cClient = StreamChat.getInstance(apiKey);
        await cClient.connectUser(
          {
            id: user.id,
            name: user.name,
            image: user.image,
          },
          token
        );

        if (isMounted) {
          setVideoClient(vClient);
          setChatClient(cClient);
        }
      } catch (error) {
        console.error("Failed to initialize Stream clients:", error);
      }
    };

    initClients();

    return () => {
      isMounted = false;
      if (vClient) {
        vClient.disconnectUser();
      }
      if (cClient) {
        cClient.disconnectUser();
      }
    };
  }, [apiKey, user?.id, token]);

  return { videoClient, chatClient };
}