import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Search, Send, Bot, Paperclip, Check, CheckCheck, PlusCircle, X, Download, File, Image as ImageIcon, Video, Mic, MicOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { chatWithBot } from '../services/geminiService';
import { generateId } from '../utils/idGenerator';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  message: string;
  timestamp: string;
  attachment?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
}

export default function ChatView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { user } = useAuth();
  const { addTask } = useTasks();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'team' | 'ai'>(searchParams.get('tab') === 'ai' ? 'ai' : 'team');
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (searchParams.get('tab') === 'ai') {
      setActiveTab('ai');
    }
  }, [searchParams]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedChat, setSelectedChat] = useState<{ type: 'user' | 'group'; id: string; name: string } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState('hi-IN');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const recognitionRef = useRef<any>(null);

  const handleVoiceInput = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.lang = voiceLang; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      setNewMessage(transcript);
      // Optionally, we could auto-send here:
      // await sendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        toast.error("Microphone access denied. Please allow microphone access in your browser settings to use voice input.");
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error("Speech recognition error", event.error);
        toast.error(`Speech recognition error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    if (user) {
      newSocket.emit('join_room', `user_${user.id}`);
    }

    newSocket.on('chat_message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    fetchData();

    return () => {
      newSocket.close();
    };
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('taskops_token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const [usersRes, groupsRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/groups', { headers })
      ]);
      const usersData = await usersRes.json();
      const groupsData = await groupsRes.json();
      if (Array.isArray(usersData)) {
        setUsers(usersData.filter((u: User) => u.id !== user?.id));
      } else {
        console.error('Expected array for users but got:', usersData);
        setUsers([]);
      }
      if (Array.isArray(groupsData)) {
        setGroups(groupsData);
      } else {
        console.error('Expected array for groups but got:', groupsData);
        setGroups([]);
      }
    } catch (error) {
      console.error('Failed to fetch chat data', error);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      if (selectedChat.type === 'group') {
        socket?.emit('join_room', `group_${selectedChat.id}`);
        fetchGroupMembers(selectedChat.id);
      } else {
        setGroupMembers([]);
      }
    }
  }, [selectedChat]);

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch(`/api/groups/${groupId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setGroupMembers(data);
    } catch (error) {
      console.error('Failed to fetch group members', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat || !user) return;
    try {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch(`/api/messages/${selectedChat.type}/${selectedChat.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    try {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          memberIds: selectedMembers
        })
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => [...prev, data.group]);
        setShowNewGroupModal(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setSelectedMembers([]);
        setSelectedChat({ type: 'group', id: data.group.id, name: data.group.name });
      }
    } catch (error) {
      console.error('Failed to create group', error);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    await sendMessage(newMessage);
    setNewMessage('');
  };

  const sendMessage = async (text: string, attachmentUrl?: string) => {
    if (!user) return;

    if (activeTab === 'team') {
      if (!selectedChat) return;

      const msg: any = {
        sender_id: user.id,
        workspace_id: user.workspaceId,
        message: text,
        attachment: attachmentUrl
      };

      if (selectedChat.type === 'group') {
        msg.group_id = selectedChat.id;
      } else {
        msg.receiver_id = selectedChat.id;
      }
      
      socket?.emit('chat_message', msg);
    } else {
      // AI Chatbot
      const userMsg: Message = {
        id: generateId('MSG'),
        sender_id: user.id,
        message: text,
        timestamp: new Date().toISOString(),
        attachment: attachmentUrl
      };
      setMessages(prev => [...prev, userMsg]);

      try {
        const reply = await chatWithBot(text, async (taskData) => {
          await addTask({
            title: taskData.title,
            project: 'General',
            description: taskData.description || '',
            priority: taskData.priority || 'Medium',
            status: 'Todo',
            dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
            createdBy: user.id,
            assignedToType: 'user',
            assignees: [user.id],
            tags: [],
            recurring: taskData.recurring !== 'None' ? taskData.recurring : null
          });
        });
        
        const botMsg: Message = {
          id: generateId('MSG'),
          sender_id: 'bot',
          message: reply,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMsg]);
      } catch (error) {
        console.error('Failed to get bot response', error);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (activeTab === 'team' && !selectedChat) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        await sendMessage(`Sent a file: ${file.name}`, data.url);
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
    }
  };

  const renderAttachment = (url: string) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    const isVideo = /\.(mp4|webm|ogg)$/i.test(url);

    if (isImage) {
      return (
        <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
          <img src={url} alt="Attachment" className="max-w-full h-auto max-h-60 object-contain" referrerPolicy="no-referrer" />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
          <video src={url} controls className="max-w-full h-auto max-h-60" />
        </div>
      );
    }

    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors group"
      >
        <File className="w-5 h-5 text-primary-500" />
        <span className="text-xs font-medium text-slate-600 truncate flex-1">Download Attachment</span>
        <Download className="w-4 h-4 text-slate-400 group-hover:text-primary-500" />
      </a>
    );
  };

  return (
    <div className="flex h-full bg-slate-50 absolute inset-0 pb-24 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && activeTab === 'team' && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-80 bg-white border-r border-slate-200 flex flex-col z-30"
          >
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button onClick={onMenuClick} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                    <Menu className="w-6 h-6 text-slate-700" />
                  </button>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t('messages')}</h1>
                </div>
                <button 
                  onClick={() => setShowNewGroupModal(true)}
                  className="p-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl transition-colors"
                  title="New Group"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('search')}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Groups Section */}
              <div className="p-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('groups')}</h2>
                <div className="space-y-1">
                  {groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedChat({ type: 'group', id: group.id, name: group.name })}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedChat?.id === group.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        selectedChat?.id === group.id ? 'bg-primary-100' : 'bg-slate-100'
                      }`}>
                        {group.name[0]}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{group.name}</p>
                        <p className="text-xs opacity-60 truncate">Group Chat</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Messages Section */}
              <div className="p-4 pt-0">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('direct_messages')}</h2>
                <div className="space-y-1">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedChat({ type: 'user', id: u.id, name: u.name })}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedChat?.id === u.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        selectedChat?.id === u.id ? 'bg-primary-100' : 'bg-slate-100'
                      }`}>
                        {u.name[0]}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{u.name}</p>
                        <p className="text-xs opacity-60">{u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Header */}
        <div className="bg-white px-6 py-4 shadow-sm border-b border-slate-100 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            {(!showSidebar || activeTab === 'ai') && (
              <button onClick={onMenuClick} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                <Menu className="w-6 h-6 text-slate-700" />
              </button>
            )}
            {activeTab === 'team' && selectedChat ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  {selectedChat.name[0]}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">{selectedChat.name}</h2>
                  {selectedChat.type === 'group' ? (
                    <p className="text-[10px] text-slate-500 font-medium">
                      {groupMembers.length} members: {groupMembers.map(m => m.name).join(', ')}
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-500 font-medium">Online</p>
                  )}
                </div>
              </div>
            ) : activeTab === 'ai' ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">{t('routine_ai')}</h2>
                  <p className="text-xs text-slate-500">Always here to help</p>
                </div>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t('messages')}</h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mr-4">
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'team' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('team_chat')}
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                  activeTab === 'ai' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                {t('routine_ai')}
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedChat && activeTab === 'team' ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
                <Send className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Your Messages</h3>
              <p className="text-sm text-slate-500 max-w-xs">Select a contact or group from the sidebar to start chatting with your team.</p>
            </div>
          ) : (
            messages.filter(m => {
              if (activeTab === 'ai') return m.sender_id === 'bot' || m.receiver_id === 'bot';
              if (!selectedChat) return false;
              if (selectedChat.type === 'group') return m.group_id === selectedChat.id;
              return (m.sender_id === selectedChat.id && m.receiver_id === user?.id) || 
                     (m.sender_id === user?.id && m.receiver_id === selectedChat.id);
            }).map((msg) => {
              const isMe = msg.sender_id === user?.id;
              const sender = users.find(u => u.id === msg.sender_id);
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isMe ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 shadow-sm rounded-tl-sm border border-slate-100'
                  }`}>
                    {!isMe && selectedChat?.type === 'group' && (
                      <p className="text-[10px] font-bold text-primary-500 mb-1">{sender?.name || 'User'}</p>
                    )}
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    {msg.attachment && renderAttachment(msg.attachment)}
                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-primary-200' : 'text-slate-400'}`}>
                      <span className="text-[10px]">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {(selectedChat || activeTab === 'ai') && (
          <div className="bg-white p-4 border-t border-slate-100">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto w-full">
              {activeTab !== 'ai' && (
                <label className={`p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer ${isUploading ? 'animate-pulse' : ''}`}>
                  <Paperclip className="w-5 h-5" />
                  <input 
                    type="file" 
                    className="hidden" 
                    disabled={isUploading}
                    onChange={handleFileUpload} 
                  />
                </label>
              )}
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-rose-100 text-rose-500 animate-pulse' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                title="Voice Input"
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={activeTab === 'team' ? t('type_message') : t('ask_routine')}
                className="flex-1 bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isUploading}
                className="p-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-all shadow-lg shadow-primary-200 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* New Group Modal */}
      <AnimatePresence>
        {showNewGroupModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800">Create New Group</h2>
                <button onClick={() => setShowNewGroupModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Marketing Team"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="What is this group for?"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-medium text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Members</label>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                    {users.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleMember(u.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors ${
                          selectedMembers.includes(u.id) ? 'bg-primary-50 border-primary-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold">
                            {u.name[0]}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-slate-700">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.role}</p>
                          </div>
                        </div>
                        {selectedMembers.includes(u.id) && <Check className="w-4 h-4 text-primary-600" />}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary-200 active:scale-95 disabled:opacity-50"
                >
                  Create Group
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
