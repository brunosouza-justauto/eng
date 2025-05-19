import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiBell } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { 
  selectNotifications, 
  selectUnreadCount, 
  fetchNotifications, 
  markNotificationsAsRead 
} from '../../store/slices/notificationSlice';
import { formatDistanceToNow } from 'date-fns';
import { AppDispatch } from '../../store/store';
import { Notification, NotificationType } from '../../types/notifications';

const NotificationBell: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications when component mounts
  useEffect(() => {
    dispatch(fetchNotifications());

    // Poll for new notifications every 2 minutes
    const interval = setInterval(() => {
      dispatch(fetchNotifications());
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [dispatch]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format the time (e.g., "2 hours ago")
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'some time ago';
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark notification as read
    if (!notification.is_read) {
      dispatch(markNotificationsAsRead([notification.id]));
    }

    // Navigate based on notification type and related entity
    switch (notification.type) {
      case 'new_athlete':
        if (notification.related_entity_id) {
          navigate(`/admin/athletes/${notification.related_entity_id}`);
        }
        break;
      case 'check_in':
        if (notification.related_entity_id) {
          navigate(`/admin/checkins/${notification.related_entity_id}`);
        }
        break;
      case 'workout_completed':
        if (notification.related_entity_id) {
          navigate(`/admin/athletes/${notification.sender_id}/workouts/log/${notification.related_entity_id}`);
        }
        break;
      case 'steps_completed':
        if (notification.sender_id) {
          navigate(`/admin/athletes/${notification.sender_id}/steps`);
        }
        break;
      case 'nutrition_assigned':
        if (notification.related_entity_id) {
          navigate(`/meal-plan/${notification.related_entity_id}`);
        }
        break;
      case 'program_assigned':
        if (notification.related_entity_id) {
          navigate(`/workout-plan/${notification.related_entity_id}`);
        }
        break;
      default:
        // Default fallback to the dashboard
        navigate('/dashboard');
    }

    // Close dropdown
    setIsOpen(false);
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const unreadIds = notifications
      .filter((notification: Notification) => !notification.is_read)
      .map((notification: Notification) => notification.id);
    
    if (unreadIds.length > 0) {
      dispatch(markNotificationsAsRead(unreadIds));
    }
  };

  // Get the appropriate icon for a notification type
  const getNotificationIcon = (type: NotificationType | string) => {
    switch (type) {
      case 'new_athlete':
        return (
          <div className="p-2 text-white bg-green-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case 'check_in':
        return (
          <div className="p-2 text-white bg-blue-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        );
      case 'workout_completed':
        return (
          <div className="p-2 text-white bg-orange-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'steps_completed':
        return (
          <div className="p-2 text-white bg-purple-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        );
      case 'nutrition_assigned':
        return (
          <div className="p-2 text-white bg-red-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case 'program_assigned':
        return (
          <div className="p-2 text-white bg-purple-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        );
      case 'system':
        return (
          <div className="p-2 text-white bg-gray-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 text-white bg-gray-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
        aria-label="Notifications"
      >
        <FiBell className="w-6 h-6" />
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 overflow-hidden bg-white rounded-lg shadow-lg dark:bg-gray-800 w-80 max-h-96 overflow-y-auto">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    !notification.is_read ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                  }`}
                >
                  <div className="flex items-start">
                    {/* Icon based on notification type */}
                    <div className="flex-shrink-0 mr-3">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Notification content */}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    
                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="w-2 h-2 mt-1 ml-2 bg-indigo-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-2 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
              Showing {notifications.length} most recent notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 