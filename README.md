# Surprise Sender

A modern email automation platform built with React, TypeScript, and Express.

## Features

- 🔐 Secure authentication with JWT
- 📧 SMTP configuration management
- 📊 Bulk email import and validation
- 🎨 Modern UI with Tailwind CSS
- 🔄 Real-time status updates
- 📱 Responsive design
- 🔒 Role-based access control
- 📝 Activity logging

## Tech Stack

- **Frontend:**
  - React 18
  - TypeScript
  - Tailwind CSS
  - React Router
  - React Hot Toast
  - Heroicons

- **Backend:**
  - Express.js
  - TypeORM
  - SQLite
  - JWT Authentication
  - Nodemailer
  - Express Rate Limit

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/surprise-sender.git
   cd surprise-sender
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and configure your environment variables:
   ```env
   PORT=3001
   JWT_SECRET=your-secret-key
   # ... other environment variables
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. In a separate terminal, start the backend server:
   ```bash
   npm run server
   ```

## Project Structure

```
surprise-sender/
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/       # React context providers
│   ├── pages/         # Page components
│   └── utils/         # Utility functions
├── server/
│   ├── controllers/   # Route controllers
│   ├── entities/      # TypeORM entities
│   ├── middleware/    # Express middleware
│   ├── routes/        # API routes
│   └── utils/         # Server utilities
├── public/            # Static assets
└── dist/             # Build output
```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### SMTP Configuration

- `GET /api/settings/smtp` - Get all SMTP configurations
- `POST /api/settings/smtp` - Add new SMTP configuration
- `PUT /api/settings/smtp/:id` - Update SMTP configuration
- `DELETE /api/settings/smtp/:id` - Delete SMTP configuration
- `POST /api/settings/smtp/import` - Import SMTP configurations

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation with Zod

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [TypeORM](https://typeorm.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Heroicons](https://heroicons.com/)
#   s u r p r i s e - s e n d e r  
 