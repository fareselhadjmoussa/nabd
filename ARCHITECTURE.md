# Nabd Chat - Architecture Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌─────────────────────┐              ┌─────────────────────┐              │
│  │    Web Browser      │              │    Mobile App       │              │
│  │   (React/Web)       │              │   (React Native)   │              │
│  └──────────┬──────────┘              └──────────┬──────────┘              │
└─────────────┼───────────────────────────────────────┼────────────────────────┘
              │                                       │
              │ HTTPS + WebSocket                     │
              │                                       │
┌─────────────▼───────────────────────────────────────▼────────────────────────┐
│                             FRONTEND SERVER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Vercel (React SPA)                          │    │
│  │   - Authentication UI     - Chat Interface    - Responsive Design    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              │ HTTP/REST + WebSocket (wss://)
              │
┌─────────────▼──────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Railway (Node.js/Express)                       │    │
│  │                                                                       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │    │
│  │  │  REST API  │  │ Socket.io  │  │  uploader   │  │    Auth     │   │    │
│  │  │  Server    │  │   Server   │  │  Middleware │  │  Middleware │   │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
              │                    │                    │
              │                    │                    │
    ┌─────────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
    │   MongoDB Atlas  │  │  Cloudinary    │  │   JWT Secret   │
    │   (Database)    │  │  (File Store)  │  │  (Security)    │
    └─────────────────┘  └────────────────┘  └───────────────┘
```

## Database Schema

### Users Collection
```
Users {
  _id: ObjectId
  username: String (unique)
  email: String (unique)
  password: String (hashed)
  avatar: String (URL)
  status: String (online/offline/away)
  lastSeen: Date
  createdAt: Date
}
```

### Conversations Collection
```
Conversations {
  _id: ObjectId
  type: String (direct/group)
  name: String (for groups)
  participants: [ObjectId] (User refs)
  lastMessage: ObjectId (Message ref)
  createdAt: Date
  updatedAt: Date
}
```

### Messages Collection
```
Messages {
  _id: ObjectId
  conversationId: ObjectId
  sender: ObjectId (User ref)
  type: String (text/image/video/audio)
  content: String
  mediaUrl: String
  readBy: [ObjectId]
  deleted: Boolean
  createdAt: Date
}
```

## API Routes

### Authentication Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | User login |
| POST | /api/auth/logout | User logout |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/profile | Update profile |

### User Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | Get all users |
| GET | /api/users/:id | Get user by ID |
| GET | /api/users/search | Search users |
| PUT | /api/users/status | Update online status |

### Conversation Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/conversations | Get user conversations |
| POST | /api/conversations | Create conversation |
| GET | /api/conversations/:id | Get conversation by ID |
| PUT | /api/conversations/:id | Update conversation |
| DELETE | /api/conversations/:id | Delete conversation |

### Message Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/messages/:conversationId | Get messages |
| POST | /api/messages | Send message |
| PUT | /api/messages/:id/read | Mark as read |
| DELETE | /api/messages/:id | Delete message |

### Media Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload/image | Upload image |
| POST | /api/upload/video | Upload video |
| POST | /api/upload/audio | Upload audio |

## WebSocket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| join | {userId} | Join user's room |
| leave | {userId} | Leave user's room |
| sendMessage | {conversationId, content, type} | Send a message |
| typingStart | {conversationId} | Start typing |
| typingStop | {conversationId} | Stop typing |
| markRead | {conversationId, messageId} | Mark message read |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| newMessage | {message} | New message received |
| messageSent | {message} | Confirmation of sent message |
| userOnline | {userId} | User came online |
| userOffline | {userId} | User went offline |
| typing | {conversationId, userId} | User is typing |
| messageRead | {conversationId, messageId} | Message was read |
| error | {message} | Error occurred |

## Security Measures

1. **JWT Authentication**
   - Access token (15min expiry)
   - Refresh token (7 days expiry)
   - Tokens stored in HTTP-only cookies

2. **Password Security**
   - bcrypt hashing with salt rounds: 12
   - Password validation (min 8 chars)

3. **Input Validation**
   - express-validator for all inputs
   - Sanitization of user inputs
   - SQL/NoSQL injection prevention

4. **Rate Limiting**
   - 100 requests per 15 minutes per IP
   - 5 attempts per 15 minutes for auth routes

5. **File Upload Security**
   - File type validation
   - File size limits (images: 5MB, videos: 50MB, audio: 10MB)
   - Content-Type validation
   - Secure file naming

## File Storage (Cloudinary)

```
Cloudinary Structure:
├──nabd-chat/           (Main folder)
│   ├── avatars/         (User profile pictures)
│   ├── images/          (Chat images)
│   ├── videos/          (Chat videos)
│   └── audio/           (Voice messages)
```

## RTL Support (Arabic)

The application fully supports Right-to-Left (RTL) languages like Arabic:

1. **CSS Direction**: `dir="rtl"` for Arabic users
2. **Flexbox Direction**: `flex-direction: row-reverse`
3. **Text Alignment**: `text-align: right` for Arabic content
4. **Icon Mirroring**: Icons flipped for RTL layouts

## Scalability Considerations

1. **Horizontal Scaling**: Stateless backend allows multiple instances
2. **Database Indexing**: Proper indexes on frequently queried fields
3. **Socket Scaling**: Redis adapter for Socket.io in production
4. **CDN**: Static assets served via CDN
5. **Caching**: Redis for session management (future)
