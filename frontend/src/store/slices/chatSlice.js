import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';

export const fetchChats = createAsyncThunk('chat/fetchChats', async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/chats', { params });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createChat = createAsyncThunk('chat/createChat', async (chatData = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/chats', chatData);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchMessages = createAsyncThunk('chat/fetchMessages', async (chatId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/chats/${chatId}/messages`);
    return { chatId, ...data.data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const deleteChat = createAsyncThunk('chat/deleteChat', async (chatId, { rejectWithValue }) => {
  try {
    await api.delete(`/chats/${chatId}`);
    return chatId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const updateChat = createAsyncThunk('chat/updateChat', async ({ id, ...updates }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/chats/${id}`, updates);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    currentChat: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    streamingContent: '',
    error: null,
    selectedModel: localStorage.getItem('selectedModel') || 'claude-3-haiku-20240307',
    webSearchEnabled: false,
    activeAgent: null,
  },
  reducers: {
    setCurrentChat: (state, action) => { state.currentChat = action.payload; state.messages = []; },
    setMessages: (state, action) => { state.messages = action.payload; },
    addMessage: (state, action) => { state.messages.push(action.payload); },
    updateLastMessage: (state, action) => {
      if (state.messages.length > 0) {
        const last = state.messages[state.messages.length - 1];
        Object.assign(last, action.payload);
      }
    },
    setStreaming: (state, action) => { state.isStreaming = action.payload; },
    setStreamingContent: (state, action) => { state.streamingContent = action.payload; },
    appendStreamingContent: (state, action) => { state.streamingContent += action.payload; },
    clearStreamingContent: (state) => { state.streamingContent = ''; },
    setSelectedModel: (state, action) => { state.selectedModel = action.payload; localStorage.setItem('selectedModel', action.payload); },
    toggleWebSearch: (state) => { state.webSearchEnabled = !state.webSearchEnabled; },
    setActiveAgent: (state, action) => { state.activeAgent = action.payload; },
    updateChatTitle: (state, action) => {
      const { chatId, title } = action.payload;
      const chat = state.chats.find(c => c._id === chatId);
      if (chat) chat.title = title;
      if (state.currentChat?._id === chatId) state.currentChat.title = title;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.fulfilled, (state, action) => { state.chats = action.payload.chats; })
      .addCase(createChat.fulfilled, (state, action) => { state.chats.unshift(action.payload.chat); state.currentChat = action.payload.chat; state.messages = []; })
      .addCase(fetchMessages.pending, (state) => { state.isLoading = true; })
      .addCase(fetchMessages.fulfilled, (state, action) => { state.isLoading = false; state.messages = action.payload.messages; state.currentChat = action.payload.chat; })
      .addCase(fetchMessages.rejected, (state) => { state.isLoading = false; })
      .addCase(deleteChat.fulfilled, (state, action) => {
        state.chats = state.chats.filter(c => c._id !== action.payload);
        if (state.currentChat?._id === action.payload) { state.currentChat = null; state.messages = []; }
      })
      .addCase(updateChat.fulfilled, (state, action) => {
        const idx = state.chats.findIndex(c => c._id === action.payload.chat._id);
        if (idx !== -1) state.chats[idx] = action.payload.chat;
        if (state.currentChat?._id === action.payload.chat._id) state.currentChat = action.payload.chat;
      });
  },
});

export const { setCurrentChat, setMessages, addMessage, updateLastMessage, setStreaming, setStreamingContent, appendStreamingContent, clearStreamingContent, setSelectedModel, toggleWebSearch, setActiveAgent, updateChatTitle } = chatSlice.actions;
export default chatSlice.reducer;
