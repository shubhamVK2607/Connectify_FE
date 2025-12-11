// useChatStore.js
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadCount: 0, // NEW: Track total unread messages

  getConnections: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/message/connections");
      set({ users: res.data.data.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // NEW: Get unread message count
  getUnreadCount: async () => {
    try {
      const res = await axiosInstance.get("/message/unread-count");
      set({ unreadCount: res.data.unreadCount });
    } catch (error) {
      console.error("Error getting unread count:", error);
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/message/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(
        `/message/send/${selectedUser._id}`,
        messageData
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  // Mark messages as seen when user opens chat
  markMessagesAsSeen: async (senderId) => {
    try {
      await axiosInstance.put(`/message/seen/${senderId}`);
      
      // Update local state immediately
      const { messages } = get();
      const updatedMessages = messages.map((msg) => 
        msg.senderId === senderId && msg.status === 'sent'
          ? { ...msg, status: 'seen' }
          : msg
      );
      set({ messages: updatedMessages });

      // NEW: Refresh unread count after marking as seen
      get().getUnreadCount();
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    // Listen for new messages
    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser =
        newMessage.senderId === selectedUser._id;
      
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });

      // Automatically mark as seen since chat is open
      get().markMessagesAsSeen(selectedUser._id);
    });

    // Listen for messages seen event
    socket.on("messagesSeen", ({ userId }) => {
      const { messages, selectedUser } = get();
      
      // Update messages status to 'seen' if they were sent to this user
      if (selectedUser && userId === selectedUser._id) {
        const updatedMessages = messages.map((msg) =>
          msg.receiverId === userId && msg.status === 'sent'
            ? { ...msg, status: 'seen' }
            : msg
        );
        set({ messages: updatedMessages });
      }
    });
  },

  // NEW: Subscribe to global unread count updates
  subscribeToUnreadCount: () => {
    const socket = useAuthStore.getState().socket;
    
    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      const authUser = useAuthStore.getState().authUser;
      
      // If message is for current user and not viewing that chat
      if (newMessage.receiverId === authUser._id) {
        if (!selectedUser || selectedUser._id !== newMessage.senderId) {
          // Increment unread count
          set({ unreadCount: get().unreadCount + 1 });
        }
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messagesSeen");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));