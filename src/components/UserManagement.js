import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, deleteUser } from '../api';
import { useUser } from '../contexts/UserContext';

const UserManagement = ({ adminUser }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { demoteUser } = useUser();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await getUsers();
      console.log('Fetched users:', fetchedUsers);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminUser && adminUser.username) {
      fetchUsers();
    } else {
      setError('Admin user information is missing');
    }
  }, [adminUser, fetchUsers]);

  const handleAction = useCallback((user, actionType) => {
    setSelectedUser(user);
    setAction(actionType);
  }, []);

  const confirmAction = async () => {
    try {
      setLoading(true);
      setError(null);
      if (action === 'delete') {
        await deleteUser(selectedUser.username);
        console.log(`User ${selectedUser.username} deleted successfully`);
      } else if (action === 'demote') {
        const result = await demoteUser(selectedUser.username);
        console.log(`User ${selectedUser.username} demote result:`, result);
      }
      await fetchUsers(); // Refresh the user list
      alert(`User ${action === 'delete' ? 'deleted' : 'demoted'} successfully`);
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      setError(`Failed to ${action} user. ${error.message}`);
    } finally {
      setLoading(false);
      setSelectedUser(null);
      setAction(null);
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading users...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 mt-8">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-sm">User</th>
              <th className="border p-2 text-sm">Status</th>
              <th className="border p-2 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.username} className="text-sm">
                <td className="border p-2">
                  <div>{user.username}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </td>
                <td className="border p-2">
                  <div>{user.isPremium ? 'Premium' : 'Free'}</div>
                  <div>{user.isAdmin ? 'Admin' : 'User'}</div>
                </td>
                <td className="border p-2">
                  {user.username !== adminUser.username && (
                    <div className="flex flex-col space-y-2">
                      {!user.isAdmin && (
                        <button 
                          onClick={() => handleAction(user, 'delete')} 
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                        >
                          Delete
                        </button>
                      )}
                      {user.isPremium && !user.isAdmin && (
                        <button 
                          onClick={() => handleAction(user, 'demote')} 
                          className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                        >
                          Demote
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedUser && action && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
            <p>Are you sure you want to {action} user {selectedUser.username}?</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={confirmAction} className="bg-green-500 text-white px-4 py-2 rounded text-sm">Confirm</button>
              <button onClick={() => { setSelectedUser(null); setAction(null); }} className="bg-gray-500 text-white px-4 py-2 rounded text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;