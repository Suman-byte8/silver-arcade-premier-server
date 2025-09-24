# Silver Arcade Premiere Backend

## USER API Documentation

### 1. User Registration

#### POST /api/users/register

Register a new user in the system.

#### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe123",
  "memberShipType": "premium",
  "memberShipStartDate": "2025-07-28",
  "memberShipEndDate": "2026-07-28",
  "phoneNumber": "9876543210",
  "whatsAppNumber": "9876543210",
  "email": "john.doe@example.com",
  "address": "123 Main Street, City, Country - 123456",
  "alternateNumber": "8765432109",
  "password": "Password123!"
}
```

#### Success Response (201 Created)

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "68878f18b7f869bdbe0acda9",
    "username": "johndoe123",
    "email": "john.doe@example.com",
    "role": "user"
  }
}
```

#### Error Response (400 Bad Request)

```json
{
  "message": "User already exists"
}
```

### Required Fields

- firstName: String
- lastName: String
- username: String (unique)
- memberShipType: String
- memberShipStartDate: Date (YYYY-MM-DD)
- memberShipEndDate: Date (YYYY-MM-DD)
- phoneNumber: String
- whatsAppNumber: String
- email: String (unique)
- address: String
- alternateNumber: String
- password: String

### Notes

- All fields are required
- Email must be unique and valid
- Username must be unique
- Passwords are securely hashed before storage

### 2. User Login

#### POST /api/users/login

Authenticate a user and receive a JWT token.

#### Request Body

```json
{
  "email": "john.doe@example.com",
  "password": "Password123!"
}
```

#### Success Response (200 OK)

```json
{
  "message": "User logged in successfully",
  "user": {
    "id": "68878f18b7f869bdbe0acda9",
    "username": "johndoe123",
    "email": "john.doe@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ODc4ZjE4YjdmODY5YmRiZTBhY2RhOSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzUzNzE3MDIyLCJleHAiOjE3NTYzMDkwMjJ9.KcEjpCzZbr1miO9taJO6OzKC2slfmCFm7ozCyddc5aA"
}
```

#### Error Response (400 Bad Request)

```json
{
  "message": "Invalid credentials"
}
```

#### Required Fields

- email: String (valid email format)
- password: String

#### Notes

- Email must be registered in the system
- Password must match the stored hashed password
- Successful login returns a JWT token for authentication
- Token should be included in subsequent requests as Bearer token
- Token expires after 30 days

#### Example Usage

```bash
curl -X POST http://localhost:3000/api/users/login \
-H "Content-Type: application/json" \
-d '{"email": "john.doe@example.com", "password": "Password123!"}'
```

### 3. Get User Profile

#### GET /api/users/profile/:userId

Get detailed user profile information. Requires authentication.

#### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "user": {
    "id": "68878f18b7f869bdbe0acda9",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe123",
    "email": "john.doe@example.com",
    "role": "user",
    "memberShipType": "premium",
    "memberShipStartDate": "2025-07-28T00:00:00.000Z",
    "memberShipEndDate": "2026-07-28T00:00:00.000Z",
    "phoneNumber": "9876543210",
    "whatsAppNumber": "9876543210",
    "address": "123 Main Street, City, Country - 123456",
    "alternateNumber": "8765432109"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "message": "User not found"
}
```

#### Error Response (401 Unauthorized)

```json
{
  "message": "Not authorized to access this route"
}
```

#### Notes

- Requires valid JWT token in Authorization header
- Returns all user fields except password
- User ID must match authenticated user's ID
- Dates are returned in ISO 8601 format

#### Example Usage

```bash
curl -X GET http://localhost:3000/api/users/profile/68878f18b7f869bdbe0acda9 \
-H "Authorization: Bearer <your_jwt_token>"
```

## Admin API Documentation

### 1. Admin Registration

#### POST /api/admin/register

Register a new admin in the system.

#### Request Body

```json
{
  "firstName": "Admin",
  "lastName": "User",
  "username": "admin123",
  "email": "admin@silverarcade.com",
  "password": "Admin@123",
  "phoneNumber": "9876543210",
  "permissions": [
    "create_user",
    "edit_user",
    "delete_user",
    "view_analytics",
    "manage_memberships"
  ],
  "role": "admin"
}
```

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Admin registered successfully",
  "admin": {
    "id": "68878f18b7f869bdbe0acda9",
    "username": "admin123",
    "email": "admin@silverarcade.com",
    "role": "admin",
    "permissions": [
      "create_user",
      "edit_user",
      "delete_user",
      "view_analytics",
      "manage_memberships"
    ],
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Admin Login

#### POST /api/admin/login

Authenticate an admin user.

#### Request Body

```json
{
  "email": "admin@silverarcade.com",
  "password": "Admin@123"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Admin logged in successfully",
  "admin": {
    "id": "68878f18b7f869bdbe0acda9",
    "username": "admin123",
    "email": "admin@silverarcade.com",
    "role": "admin",
    "permissions": ["create_user", "edit_user", "view_analytics"],
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Get Admin Profile

#### GET /api/admin/profile/:adminId

Get detailed admin profile information.

#### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "admin": {
    "id": "68878f18b7f869bdbe0acda9",
    "firstName": "Admin",
    "lastName": "User",
    "username": "admin123",
    "email": "admin@silverarcade.com",
    "role": "admin",
    "permissions": ["create_user", "edit_user", "view_analytics"],
    "phoneNumber": "9876543210",
    "status": "active",
    "lastLogin": "2025-07-28T10:30:00.000Z",
    "createdAt": "2025-07-28T09:00:00.000Z",
    "updatedAt": "2025-07-28T10:30:00.000Z"
  }
}
```

### 4. Get User Activity

#### GET /api/admin/user-activity

Get all user activities (admin only).

#### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "activities": [
    {
      "id": "68878f18b7f869bdbe0acda9",
      "userId": "68878f18b7f869bdbe0acda8",
      "action": "login",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-07-28T10:30:00.000Z"
    }
    // ... more activities
  ]
}
```

### Error Responses

#### Unauthorized (401)

```json
{
  "message": "Not authorized, no token"
}
```

#### Forbidden (403)

```json
{
  "message": "Role user is not authorized to access this route"
}
```

#### Validation Error (400)

```json
{
  "message": "Invalid credentials"
}
```

### Notes

- All protected routes require JWT token in Authorization header
- Admin registration requires all fields to be valid
- Passwords are hashed before storage
- User activity is logged for security tracking
- Only active admins can access protected routes

### 5. Add a New Room

#### POST /api/admin/add-room

Add a new gaming room to the system. This endpoint requires `multipart/form-data` for image uploads.

#### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

#### Form Data

- `roomName` (String): The name of the room.
- `roomType` (String): The type of room (e.g., "Premium VIP", "Standard").
- `roomCapacity` (Number): The maximum number of people the room can accommodate.
- `roomPrice` (Number): The price of the room per session/hour.
- `roomDescription` (String): A detailed description of the room and its features.
- `roomImage` (File): The image file for the room.

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Room added successfully",
  "room": {
    "roomName": "Elite Gaming Suite Alpha",
    "roomType": "Premium VIP",
    "roomCapacity": 8,
    "roomPrice": 2500,
    "roomDescription": "Premium gaming sanctuary featuring:\n- 8 High-End Gaming PCs with RTX 4090\n- 360Hz Gaming Monitors\n- Herman Miller Gaming Chairs\n- Private Streaming Setup\n- RGB Ambient Lighting\n- Premium Audio System\n- Mini Refrigerator\n- Climate Control",
    "roomImage": "https://res.cloudinary.com/dybk0f5nc/image/upload/v1754201449/silver-arcade/rooms/tdkfusad6wyi1haiypko.jpg",
    "roomStatus": "available",
    "_id": "688efd6ae65bb02c41f5efab",
    "createdAt": "2025-08-03T06:10:50.695Z",
    "__v": 0
  }
}
```

#### Image Upload with Cloudinary and Streamifier

The image upload process is handled efficiently without saving files to the server's local disk.

1.  **Middleware (`multer`)**: The route uses `multer` as middleware to process the `multipart/form-data`. Instead of saving the uploaded file to disk, `multer` is configured to hold the file in memory as a buffer.
2.  **In-Memory Buffer**: The `req.file.buffer` contains the entire image file as raw binary data.
3.  **`streamifier`**: The `streamifier` library creates a readable stream directly from the `buffer`. This is crucial because Cloudinary's Node.js SDK can work with streams.
4.  **Cloudinary Upload Stream**: The `cloudinary.uploader.upload_stream` function is called. It's a writable stream that accepts the image data. We `pipe` the readable stream created by `streamifier` into this upload stream.
5.  **Cloudinary Processing**: Cloudinary receives the stream, uploads the image to your cloud storage, and performs any specified transformations. Once complete, it invokes a callback function.
6.  **URL Retrieval**: The callback function receives the result from Cloudinary, which includes the secure `url` of the uploaded image.
7.  **Database Storage**: This URL is then saved as the `roomImage` field in the new room document in the MongoDB database.

This stream-based approach is highly efficient and scalable as it avoids intermediate file I/O on the server, making it ideal for containerized or serverless environments.


### 6. Hero Banner Management

These endpoints manage the hero banner content on the home page.

#### GET /api/admin/content/hero-banner

Retrieve the current hero banner content.

##### Success Response (200 OK)

```json
{
    "success": true,
    "heroBanners": [
        {
            "_id": "688f0d32e65bb02c41f5efc4",
            "title": "Member Exclusive Offer",
            "subtitle": "Found a better rate elsewhere? We'll not only match it but also offer additional 25% off",
            "description": "lorem ipsum 2525",
            "image": "https://res.cloudinary.com/dybk0f5nc/image/upload/v1754204850/hero_banners/f5g3v3g3g3g3g3g3g3g3.jpg",
            "url": "https://google.co.in",
            "page": "home",
            "section": "hero",
            "isActive": true,
            "createdAt": "2025-08-03T07:07:30.168Z",
            "__v": 0
        }
    ]
}
```

#### POST /api/admin/content/add-hero-banner

Add a new hero banner. Requires `multipart/form-data` for the image upload.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

##### Form Data

-   `title` (String): The main title of the banner.
-   `subtitle` (String, optional): A subtitle for the banner.
-   `description` (String): A short description.
-   `url` (String): The URL the banner should link to.
-   `image` (File): The banner image file.

##### Success Response (201 Created)

```json
{
    "success": true,
    "message": "Hero banner added successfully",
    "heroBanner": {
        "title": "Member Exclusive Offer",
        "subtitle": "Found a better rate elsewhere? We'll not only match it but also offer additional 25% off",
        "description": "lorem ipsum 2525",
        "image": "https://res.cloudinary.com/dybk0f5nc/image/upload/v1754204850/hero_banners/f5g3v3g3g3g3g3g3g3g3.jpg",
        "url": "https://google.co.in",
        "page": "home",
        "section": "hero",
        "isActive": true,
        "_id": "688f0d32e65bb02c41f5efc4",
        "createdAt": "2025-08-03T07:07:30.168Z",
        "__v": 0
    }
}
```

#### PUT /api/admin/content/update-hero-banner/:id

Update an existing hero banner. Also uses `multipart/form-data` if a new image is provided.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

##### Form Data

-   `title` (String): The updated title.
-   `subtitle` (String, optional): The updated subtitle.
-   `description` (String): The updated description.
-   `url` (String): The updated URL.
-   `image` (File, optional): A new image file to replace the existing one.

#### DELETE /api/admin/content/delete-hero-banner/:id

Delete a hero banner by its ID.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

##### Success Response (200 OK)

```json
{
    "success": true,
    "message": "Hero banner deleted successfully"
}
```
### 7. Curated Offers Management

These endpoints manage the curated offers content on the home page.

#### GET /api/admin/content/get-curated-offers

Retrieve the current curated offers.

##### Success Response (200 OK)

```json
{
    "success": true,
    "offers": []
}
```

#### POST /api/admin/content/add-curated-offer

Add a new curated offer. Requires `multipart/form-data` for the image upload.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

##### Form Data

-   `title` (String): The title of the offer.
-   `description` (String): A short description of the offer.
-   `path` (String): The URL path for the offer.
-   `image` (File): The offer image file.

##### Success Response (201 Created)

```json
{
    "success": true,
    "message": "Curated offer added successfully",
    "offer": {
        "title": "curated offer",
        "description": "lorem ipsum",
        "image": "https://res.cloudinary.com/dybk0f5nc/image/upload/v1754208733/taltala_subharambha_p1qj1l.png",
        "path": "curated-offer.in",
        "_id": "688f1cdd5e60b5d3e8f6b8e8",
        "createdAt": "2025-08-03T08:12:13.384Z",
        "__v": 0
    }
}
```

#### PUT /api/admin/content/update-curated-offer/:id

Update an existing curated offer. Also uses `multipart/form-data` if a new image is provided.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

##### Form Data

-   `title` (String): The updated title.
-   `description` (String): The updated description.
-   `path` (String): The updated path.
-   `image` (File, optional): A new image file to replace the existing one.

#### DELETE /api/admin/content/delete-curated-offer/:id

Delete a curated offer by its ID.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

##### Success Response (200 OK)

```json
{
    "success": true,
    "message": "Curated offer deleted successfully"
}
```
### 8. Footer Links Management

These endpoints manage the footer links.

#### GET /api/admin/content/get-footer-links

Retrieve all footer links.

##### Success Response (200 OK)

```json
{
    "success": true,
    "footerLinks": []
}
```

#### POST /api/admin/content/add-footer-link

Add a new footer link.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

##### Request Body

```json
{
    "title": "About Us",
    "path": "/about"
}
```

##### Success Response (201 Created)

```json
{
    "success": true,
    "message": "Footer link added successfully",
    "footerLink": {
        "title": "About Us",
        "path": "/about",
        "_id": "688f2e855e60b5d3e8f6b8f5",
        "createdAt": "2025-08-03T08:42:13.384Z",
        "__v": 0
    }
}
```

#### PUT /api/admin/content/update-footer-link/:id

Update an existing footer link.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

##### Request Body

```json
{
    "title": "About Us Updated",
    "path": "/about-us"
}
```

#### DELETE /api/admin/content/delete-footer-link/:id

Delete a footer link by its ID.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

##### Success Response (200 OK)

```json
{
    "success": true,
    "message": "Footer link deleted successfully"
}
```
### 9. Membership Block Management

These endpoints manage the membership block content on the home page.

#### GET /api/admin/content/get-membership-blocks

Retrieve the current membership block content.

##### Success Response (200 OK)

```json
{
    "success": true,
    "data": []
}
```

#### POST /api/admin/content/add-membership-block

Add a new membership block. Requires `multipart/form-data` for the image upload.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

##### Form Data

-   `title` (String): The title of the membership block.
-   `description` (String): A short description.
-   `url` (String): The URL the block should link to.
-   `image` (File): The block image file.

##### Success Response (201 Created)

```json
{
    "success": true,
    "message": "Membership Block added successfully",
    "data": {
        "title": "Get 20% Off",
        "description": "lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        "image": "https://res.cloudinary.com/dybk0f5nc/image/upload/v1754211848/membership_blocks/f5g3v3g3g3g3g3g3g3g3.jpg",
        "url": "https://offers-page",
        "_id": "688f3a085e60b5d3e8f6b902",
        "createdAt": "2025-08-03T09:30:48.834Z",
        "__v": 0
    }
}
```

#### PUT /api/admin/content/update-membership-block/:id

Update an existing membership block. Also uses `multipart/form-data` if a new image is provided.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

##### Form Data

-   `title` (String): The updated title.
-   `description` (String): The updated description.
-   `url` (String): The updated URL.
-   `image` (File, optional): A new image file to replace the existing one.

#### DELETE /api/admin/content/delete-membership-block/:id

Delete a membership block by its ID.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

##### Success Response (200 OK)

```json
{
    "success": true,
    "message": "Membership Block deleted successfully"
}
```
### 10. Nav Links Management

These endpoints manage the navigation links.

#### GET /api/admin/content/get-nav-links

Retrieve all navigation links.

##### Success Response (200 OK)

```json
{
    "success": true,
    "data": []
}
```

#### POST /api/admin/content/add-nav-link

Add a new navigation link.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

##### Request Body

```json
{
    "title": "Home",
    "path": "/",
    "icon": "home-icon",
    "order": 1
}
```

##### Success Response (201 Created)

```json
{
    "success": true,
    "message": "Nav Link added successfully",
    "data": {
        "title": "Home",
        "path": "/",
        "icon": "home-icon",
        "order": 1,
        "_id": "688f3a085e60b5d3e8f6b903",
        "createdAt": "2025-08-03T09:30:48.834Z",
        "__v": 0
    }
}
```

#### PUT /api/admin/content/update-nav-link/:id

Update an existing navigation link.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

##### Request Body

```json
{
    "title": "Home Updated",
    "path": "/home",
    "icon": "home-updated-icon",
    "order": 1
}
```

#### DELETE /api/admin/content/delete-nav-link/:id

Delete a navigation link by its ID.

##### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

##### Success Response (200 OK)

```json
{
    "success": true,
    "message": "Nav Link deleted successfully"
}
```
