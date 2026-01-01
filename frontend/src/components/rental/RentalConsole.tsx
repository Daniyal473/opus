import { useState, useMemo, useEffect, useRef } from 'react';
import { fetchApartmentData, fetchTickets, transformRecordToRoomCard, extractFloors, type TeableRecord } from '../../services/teable';
import { FloorSelector } from './FloorSelector';
import { RoomGrid } from './RoomGrid';
import { PropertySidebar } from './PropertySidebar';
import { TicketRequestView } from '../admin/TicketRequestView';

import { Settings, User, Bell, Search, CheckCircle2, Info, Clock } from 'lucide-react';
import opusLogo from '../../assets/opus-logo.jpg';
import type { RoomCardData, Ticket } from '../../types/rental';
import { API_BASE_URL } from '../../services/api';
import './rental.css';

interface RentalConsoleProps {
    onLogout?: () => void;
    onAdminPanelClick?: () => void;
    onTicketRequestClick?: () => void;
    onGuestManagementClick?: () => void;
    userRole?: string;
    username?: string;
    onParkingRequestClick?: () => void;
    onFDOPanelClick?: () => void;
}

export function RentalConsole({ onLogout, onAdminPanelClick, onTicketRequestClick, onGuestManagementClick, onParkingRequestClick, onFDOPanelClick, userRole, username }: RentalConsoleProps) {
    const [selectedFloor, setSelectedFloor] = useState('all');
    const [selectedRoom, setSelectedRoom] = useState<RoomCardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [allRecords, setAllRecords] = useState<TeableRecord[]>([]);
    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isTicketRequestView, setIsTicketRequestView] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Target Ticket for Navigation
    const [targetTicketAction, setTargetTicketAction] = useState<{ id: string; timestamp: number } | null>(null);

    // Notifications State
    interface NotificationItem {
        id: string;
        status: string;
        apartment: string;
        action: string;
        ticketType: string;
        ticketId: string;
        username?: string; // Added username
        createdTime: string;
    }
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    // Unread Indicator Logic
    const [lastReadTime, setLastReadTime] = useState<number>(() => {
        const stored = localStorage.getItem('lastReadTime');
        return stored ? parseInt(stored) : Date.now();
    });
    const [hasUnread, setHasUnread] = useState(false);

    // Track URL changes (for Back/Forward)
    const [locationSearch, setLocationSearch] = useState(window.location.search);

    useEffect(() => {
        const handlePopState = () => setLocationSearch(window.location.search);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Sync URL params (Room & Ticket)
    useEffect(() => {
        const params = new URLSearchParams(locationSearch);
        const roomParam = params.get('room');
        const ticketParam = params.get('ticket');

        if (roomParam && allRecords.length > 0 && (!selectedRoom || selectedRoom.id !== roomParam)) {
            const foundRecord = allRecords.find(r => String(r.fields['Apartment Number '] || '').trim() === String(roomParam).trim());
            if (foundRecord) {
                const roomCard = transformRecordToRoomCard(foundRecord);
                setSelectedRoom(roomCard);
            }
        } else if (!roomParam && selectedRoom) {
            setSelectedRoom(null);
        }

        if (ticketParam) {
            if (!targetTicketAction || targetTicketAction.id !== ticketParam) {
                setTargetTicketAction({ id: ticketParam, timestamp: Date.now() });
            }
        } else {
            if (targetTicketAction) {
                setTargetTicketAction(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationSearch, allRecords]);

    // Sync selectedRoom to URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (selectedRoom) {
            if (params.get('room') !== selectedRoom.id) {
                params.set('room', selectedRoom.id);
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.pushState({ path: newUrl }, '', newUrl);
                setLocationSearch(window.location.search);
            }
        } else {
            if (params.has('room')) {
                params.delete('room'); // Remove room param
                params.delete('ticket'); // Also remove ticket as it belongs to room
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.pushState({ path: newUrl }, '', newUrl);
                setLocationSearch(window.location.search);
            }
        }
    }, [selectedRoom]);

    const [activeToasts, setActiveToasts] = useState<NotificationItem[]>([]);
    const knownLatestTime = useRef<number>(Date.now()); // Initialize with now to avoid toast on first load
    const lastToastRef = useRef<number>(0); // Debounce toast trigger

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/ticket-activities/`);
                if (response.ok) {
                    const data = await response.json();
                    let activities: NotificationItem[] = data.activities || [];

                    // Filter out own notifications if username is available
                    if (username) {
                        activities = activities.filter(a => a.username !== username);
                    }

                    setNotifications(activities);

                    // Check for unread
                    if (activities.length > 0) {
                        const newestTime = new Date(activities[0].createdTime).getTime();

                        // Check for new notification to show toast
                        // Check for new notifications to show toast
                        const newItems = activities.filter(a => new Date(a.createdTime).getTime() > knownLatestTime.current);

                        if (newItems.length > 0) {
                            // Add new items to active toasts ONLY if not 'user' role
                            if (userRole?.toLowerCase() !== 'user') {
                                setActiveToasts(prev => [...newItems, ...prev]);

                                // Schedule removal for each new item
                                newItems.forEach(item => {
                                    setTimeout(() => {
                                        setActiveToasts(current => current.filter(t => t.id !== item.id));
                                    }, 5000);
                                });
                            }

                            // Update known latest time to the newest one
                            const newestItemTime = new Date(newItems[0].createdTime).getTime();
                            if (newestItemTime > knownLatestTime.current) {
                                knownLatestTime.current = newestItemTime;
                            }
                        }

                        if (newestTime > lastReadTime) {
                            setHasUnread(true);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching notifications:", error);
            }
        };

        // Initial fetch
        fetchNotifications();

        if (isNotificationOpen) {
            // Optional: Poll every 30s while open
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        } else {
            // Also poll occasionally when closed to show red dot?
            // Let's poll every 60s when closed
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [isNotificationOpen, lastReadTime, userRole, username]);

    const handleNotificationClick = () => {
        setIsNotificationOpen(!isNotificationOpen);
        if (!isNotificationOpen) {
            // Opening: Mark as read
            const now = Date.now();
            setLastReadTime(now);
            localStorage.setItem('lastReadTime', String(now));
            setHasUnread(false);
        }
    };

    const handleTicketClose = () => {
        const params = new URLSearchParams(window.location.search);
        if (params.has('ticket')) {
            params.delete('ticket');
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
            setLocationSearch(window.location.search);
        }
    };

    const handleNotificationItemClick = (notif: NotificationItem) => {
        console.log("Clicked notification:", notif);
        if (notif.apartment) {
            // 1. Find the room
            // Note: apartment in notification is just the number e.g. "101"
            const foundRecord = allRecords.find(r => String(r.fields['Apartment Number '] || '').trim() === String(notif.apartment).trim());

            if (foundRecord) {
                const roomCard = transformRecordToRoomCard(foundRecord);

                // Update URL to drive state (fixes race conditions)
                const params = new URLSearchParams(window.location.search);
                params.set('room', roomCard.id);

                if (notif.ticketId) {
                    params.set('ticket', notif.ticketId);
                } else {
                    params.delete('ticket');
                }

                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.pushState({ path: newUrl }, '', newUrl);
                setLocationSearch(window.location.search);

            } else {
                console.warn("Room not found for notification:", notif.apartment);
            }
        }
        setIsNotificationOpen(false);
    };

    const formatDateTime = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Close notification when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    // Check if user has admin access (handle case and whitespace)
    console.log("RentalConsole received userRole:", userRole);
    const normalizedRole = userRole?.toLowerCase() || '';

    // Permission to see the Admin Panel button (Super Admin only)
    const showAdminPanel = normalizedRole === 'super-admin' || normalizedRole === 'super admin';

    // Permission to see all rooms (Super Admin + Admin)
    const canSeeAllRooms = showAdminPanel || normalizedRole === 'admin' || normalizedRole === 'fdo' || normalizedRole === 'security';

    // 1. Filter by User Access first (Centralized Logic)
    // ... (rest of code)

    const filteredRecordsByUser = useMemo(() => {
        let records = allRecords;
        if (!canSeeAllRooms && username) {
            records = records.filter(r => {
                const managedBy = r.fields['Managed by'];
                // Check if managedBy matches username
                return String(managedBy).trim() === String(username).trim();
            });
        }
        return records;
    }, [allRecords, canSeeAllRooms, username]);

    // Helper for status colors (matching TicketDialog)
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'text-blue-700 bg-blue-100 border-blue-200';
            case 'Under Review': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
            case 'Approved': return 'text-teal-700 bg-teal-100 border-teal-200';
            case 'Closed': return 'text-gray-700 bg-gray-100 border-gray-200';
            default: return 'text-gray-700 bg-gray-100 border-gray-200';
        }
    };

    // Derive floors from Filtered API data
    const apiFloors = useMemo(() => {
        if (filteredRecordsByUser.length === 0) return [{ code: 'all', name: 'All' }];

        const extracted = extractFloors(filteredRecordsByUser);
        const dynamicFloors = extracted.map(f => ({ code: f, name: f })); // Map to Floor interface

        return [{ code: 'all', name: 'All' }, ...dynamicFloors];
    }, [filteredRecordsByUser]);

    // Fetch floors and rooms from API
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [records, tickets] = await Promise.all([
                    fetchApartmentData(),
                    fetchTickets()
                ]);
                console.log('Raw Records from API:', records);
                console.log('Tickets from API:', tickets);
                setAllRecords(records);
                setAllTickets(tickets);
            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);



    // ... (rest of code)
    // In JSX:
    /*
                    <BuildingSelector
                        buildings={buildings}
                        selectedBuilding={selectedBuilding}
                        onBuildingChange={handleBuildingChange}
                        onAdminPanelClick={showAdminPanel ? onAdminPanelClick : undefined}
                    />
    */

    // Generate room cards based on selected floor
    const roomCards = useMemo<RoomCardData[]>(() => {
        let sourceData = filteredRecordsByUser;

        // Filter records by floor
        let filteredRecords = selectedFloor === 'all'
            ? sourceData
            : sourceData.filter(r => String(r.fields['Floor']).trim() === selectedFloor);

        // Filter by Search Term
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filteredRecords = filteredRecords.filter(r => {
                const aptNum = String(r.fields['Apartment Number '] || '').toLowerCase();
                return aptNum.includes(lowerSearch);
            });
        }

        return filteredRecords.map(r => {
            const room = transformRecordToRoomCard(r);

            // Aggregate tickets for this room
            // Note: apartmentId in room is number, in ticket is number (if converted)
            // But checking rental.ts, RoomCardData.apartmentId is number. Ticket.apartmentId is number.

            const roomTickets = allTickets.filter(t => Number(t.apartmentId) === Number(room.apartmentId));

            room.ticketCounts = {
                total: roomTickets.length,
                active: roomTickets.filter(t => t.status !== 'Closed').length,
                inOut: roomTickets.filter(t => t.type === 'In / Out' || t.type === 'Check-in / Check-out' || t.type === 'In/Out').length,
                visitor: roomTickets.filter(t => t.type === 'Visitor' || t.type === 'Visit' || t.type === 'Guest' || t.type === 'Cleaning').length,
                maintenance: roomTickets.filter(t => t.type === 'Maintenance' || t.type === 'Work Permit').length
            };
            return room;
        });

    }, [selectedFloor, filteredRecordsByUser, allTickets, searchTerm]);


    const handleFloorChange = (floorCode: string) => {
        setSelectedFloor(floorCode);
        setSelectedRoom(null);
    };

    const handleRoomSelect = (room: RoomCardData) => {
        setSelectedRoom(room);
    };

    const handleTicketCreated = () => {
        const now = Date.now();
        if (now - lastToastRef.current < 500) return; // Debounce
        lastToastRef.current = now;

        const newToast: NotificationItem = {
            id: `manual-${now}-${Math.random().toString(36).substr(2, 5)}`,
            status: 'Just now',
            apartment: selectedRoom?.id || '',
            action: 'Ticket created successfully', // Override action
            ticketType: 'New Ticket',
            ticketId: '', // Hide ID
            username: '', // Hide username
            createdTime: new Date().toISOString()
        };
        setActiveToasts(prev => [newToast, ...prev]);
        setTimeout(() => {
            setActiveToasts(current => current.filter(t => t.id !== newToast.id));
        }, 5000);
    };

    const handleTicketUpdated = () => {
        const now = Date.now();
        if (now - lastToastRef.current < 500) return; // Debounce
        lastToastRef.current = now;

        const newToast: NotificationItem = {
            id: `manual-update-${now}-${Math.random().toString(36).substr(2, 5)}`,
            status: 'Just now',
            apartment: selectedRoom?.id || '',
            action: 'Ticket updated successfully',
            ticketType: 'Updated Ticket',
            ticketId: '',
            username: '',
            createdTime: new Date().toISOString()
        };
        setActiveToasts(prev => [newToast, ...prev]);
        setTimeout(() => {
            setActiveToasts(current => current.filter(t => t.id !== newToast.id));
        }, 5000);
    };

    return (
        <>
            {isTicketRequestView ? (
                <TicketRequestView
                    onBack={() => setIsTicketRequestView(false)}
                    role={normalizedRole}
                    username={username}
                    onTicketUpdated={handleTicketUpdated}
                />
            ) : (
                <div className="grid-container">
                    {/* Left Sidebar */}
                    <aside className="left-sidebar bg-white border-r border-gray-300 shadow-sm overflow-y-auto">
                        <div className="p-0">
                            <div className="p-0 border-b border-gray-200 flex justify-center">
                                <img src={opusLogo} alt="Opus Portal" className="h-25 max-w-full object-contain" />
                            </div>

                            {/* Guest Management Button */}
                            {!canSeeAllRooms && onGuestManagementClick && (
                                <div
                                    className="px-4 py-2 text-xs font-medium cursor-pointer hover:bg-yellow-50 flex items-center gap-2 bg-yellow-50 text-yellow-600 border-b border-gray-300"
                                    onClick={onGuestManagementClick}
                                >

                                    <span className="font-medium">Ticket Management</span>
                                </div>
                            )}

                            {/* Admin Panel Button */}
                            {showAdminPanel && onAdminPanelClick && (
                                <div
                                    className="px-4 py-2 text-xs font-medium cursor-pointer hover:bg-yellow-50 flex items-center gap-2 bg-yellow-50 text-yellow-600 border-b border-gray-300"
                                    onClick={onAdminPanelClick}
                                >
                                    <Settings size={16} />
                                    <span className="font-medium">Admin Panel</span>
                                </div>
                            )}

                            {/* FDO Panel Button - Hide for Security */}
                            {/* FDO Panel Button - Hide for Security and User */}
                            {onFDOPanelClick && normalizedRole !== 'security' && normalizedRole !== 'user' && (
                                <div
                                    className="px-4 py-2 text-xs font-medium cursor-pointer hover:bg-yellow-50 flex items-center gap-2 bg-yellow-50 text-yellow-600 border-b border-gray-300"
                                    onClick={onFDOPanelClick}
                                >
                                    <Clock size={16} />
                                    <span className="font-medium">FDO Panel</span>
                                </div>
                            )}

                            {/* Ticket Request Button */}
                            {canSeeAllRooms && onTicketRequestClick && normalizedRole !== 'fdo' && normalizedRole !== 'security' && (
                                <div
                                    className="px-4 py-2 text-xs font-medium cursor-pointer hover:bg-yellow-50 flex items-center gap-2 bg-yellow-50 text-yellow-600 border-b border-gray-300"
                                    onClick={onTicketRequestClick}
                                >

                                    <span className="font-medium">Ticket Requests</span>
                                </div>
                            )}

                            {/* Parking Request Button */}
                            {onParkingRequestClick && normalizedRole !== 'user' && normalizedRole !== 'fdo' && (
                                <div
                                    className="px-4 py-2 text-xs font-medium cursor-pointer hover:bg-yellow-50 flex items-center gap-2 bg-yellow-50 text-yellow-600 border-b border-gray-300"
                                    onClick={onParkingRequestClick}
                                >
                                    <span className="font-medium">Parking Requests</span>
                                </div>
                            )}

                            <FloorSelector
                                floors={apiFloors}
                                selectedFloor={selectedFloor}
                                onFloorChange={handleFloorChange}
                                onLogout={onLogout}
                            />
                        </div>
                    </aside>

                    {/* Main Room Grid */}
                    <main className="room-grid p-2 overflow-y-auto flex flex-col">
                        <nav className="flex justify-between items-center mb-2 px-6 py-4 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div>
                                <h1 className="text-xl font-bold text-gray-800 tracking-tight">The Opus</h1>
                                <p className="text-xs text-gray-500 font-medium">Guest Services Portal</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-40">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search rooms..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                        />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                                    <div className="p-1.5 bg-white rounded-full text-gray-600 shadow-sm">
                                        <User size={18} />
                                    </div>
                                    <span className="font-medium text-gray-700 text-sm">
                                        {username || 'User'}
                                    </span>
                                </div>

                                {normalizedRole !== 'user' && (
                                    <div className="relative" ref={notificationRef}>
                                        <button
                                            onClick={handleNotificationClick}
                                            className={`p-2 rounded-full text-gray-500 hover:text-[var(--color-primary)] hover:bg-gray-100 border border-gray-200 transition-colors relative ${isNotificationOpen ? 'bg-gray-100 text-[var(--color-primary)]' : 'bg-gray-50'}`}
                                        >
                                            <Bell size={20} />
                                            {hasUnread && (
                                                <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
                                            )}
                                        </button>

                                        {/* Notification Popup */}
                                        {isNotificationOpen && (
                                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                    <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
                                                </div>
                                                <div className="max-h-80 overflow-y-auto">
                                                    {notifications.length === 0 ? (
                                                        <div className="px-4 py-8 text-center text-gray-500 text-xs">
                                                            No recent activity
                                                        </div>
                                                    ) : (
                                                        notifications.map((notif) => (
                                                            <div
                                                                key={notif.id}
                                                                className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-all duration-200 group cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleNotificationItemClick(notif);
                                                                }}
                                                            >
                                                                <div className="flex gap-3">
                                                                    {/* Icon Container */}
                                                                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${notif.action === 'Created' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                                                        }`}>
                                                                        {notif.action === 'Created' ? <CheckCircle2 size={16} /> : <Info size={16} />}
                                                                    </div>

                                                                    {/* Content */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-start">
                                                                            <p className="text-sm font-semibold text-gray-900 truncate pr-2">
                                                                                {notif.ticketType !== 'Unknown' ? notif.ticketType : 'Ticket Activity'}
                                                                            </p>
                                                                            <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
                                                                                <Clock size={10} />
                                                                                {formatDateTime(notif.createdTime)}
                                                                            </span>
                                                                        </div>

                                                                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                                                                            {notif.username ? (
                                                                                <>
                                                                                    <span className="font-medium text-gray-800">{notif.username}</span>
                                                                                    <span> </span>
                                                                                </>
                                                                            ) : ''}
                                                                            <span className={`${notif.action === 'Created' ? 'text-green-700' : 'text-blue-700'} font-medium`}>
                                                                                {notif.action}
                                                                            </span>
                                                                            {notif.ticketId && notif.ticketId !== 'Unknown' ? (
                                                                                <>
                                                                                    <span> ticket </span>
                                                                                    <span className="font-mono bg-gray-100 px-1 rounded text-gray-700 text-[10px] border border-gray-200">#{notif.ticketId}</span>
                                                                                </>
                                                                            ) : ' ticket'}
                                                                        </p>

                                                                        <div className="mt-2 flex items-center gap-2">
                                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                                                Room {notif.apartment}
                                                                            </span>
                                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(notif.status)}`}>
                                                                                {notif.status}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </nav >
                        {isLoading ? (
                            <div className="flex-1 w-full flex flex-col justify-center items-center h-full min-h-[400px] text-gray-400" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="w-12 h-12 border-4 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin mb-4"></div>
                                <p className="text-base font-medium">Loading rooms...</p>
                            </div>
                        ) : (
                            <RoomGrid
                                rooms={roomCards}
                                selectedRoomId={selectedRoom?.id || null}
                                onRoomSelect={handleRoomSelect}
                            />
                        )}
                    </main >

                    {/* Right Sidebar */}
                    {
                        (canSeeAllRooms || selectedRoom) && (
                            <PropertySidebar
                                selectedRoom={selectedRoom}
                                role={userRole}
                                username={username} // Pass username
                                targetTicketAction={targetTicketAction}
                                onTicketCreated={handleTicketCreated}
                                onTicketUpdated={handleTicketUpdated}
                                onTicketClose={handleTicketClose}
                            />
                        )
                    }
                </div>
            )}
            {/* Custom Toast Notifications Stack */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
                {activeToasts.map(toast => (
                    <div
                        key={toast.id}
                        className="bg-gray-800 text-white px-4 py-3 rounded-md shadow-xl flex items-center gap-3 animate-fade-in-down cursor-pointer hover:bg-gray-700 transition-colors max-w-sm pointer-events-auto"
                        onClick={() => handleNotificationItemClick(toast)}
                        role="alert"
                    >
                        <div className="bg-[var(--color-primary)] p-2 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm">New Activity</span>
                            <span className="text-xs text-gray-300">
                                {toast.username ? `${toast.username} ` : ''}{toast.action}{toast.ticketId ? ` ticket #${toast.ticketId}` : ''}
                            </span>
                        </div>
                        <button
                            className="ml-2 text-gray-400 hover:text-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveToasts(current => current.filter(t => t.id !== toast.id));
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}
