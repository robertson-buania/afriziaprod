export interface User {
  id: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  role: 'admin' | 'user' | 'partner';
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  partnerId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
} 