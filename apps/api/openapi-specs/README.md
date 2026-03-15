# Drive Insight API - OpenAPI Specifications

This directory contains OpenAPI 3.0.3 specifications for the Drive Insight API, organized by module.

## Overview

The Drive Insight API is a multi-tenant dealership lead management and AI automation platform with role-based access control, user management, and comprehensive monitoring capabilities.

## Specification Files

### Master Specification
- **`drive-insight-api.openapi.yaml`** - Complete API specification with all modules combined
  - Use this for a comprehensive view of all API endpoints
  - Ideal for API documentation portals and client SDK generation

### Module-Specific Specifications
- **`auth.openapi.yaml`** - Authentication Module
  - User login and authentication
  - Password management
  - JWT token handling

- **`users.openapi.yaml`** - User Management Module
  - User CRUD operations
  - User invitations
  - Profile and availability management
  - Role-based access control

- **`metrics.openapi.yaml`** - Metrics Module
  - Prometheus-compatible metrics
  - Application monitoring

## Quick Start

### Viewing the Specifications

#### Option 1: Swagger Editor (Online)
1. Visit [Swagger Editor](https://editor.swagger.io/)
2. File → Import File → Select any `.openapi.yaml` file
3. View and interact with the API documentation

#### Option 2: Swagger UI (Local)
```bash
# Install swagger-ui-watcher globally
npm install -g swagger-ui-watcher

# View the master spec
cd apps/api/openapi-specs
swagger-ui-watcher drive-insight-api.openapi.yaml

# Or view a module-specific spec
swagger-ui-watcher auth.openapi.yaml
```

#### Option 3: Redoc (Docker)
```bash
# View using Redoc
docker run -p 8080:80 \
  -v $(pwd)/apps/api/openapi-specs:/usr/share/nginx/html/specs \
  -e SPEC_URL=specs/drive-insight-api.openapi.yaml \
  redocly/redoc

# Access at http://localhost:8080
```

#### Option 4: VS Code Extension
1. Install the "OpenAPI (Swagger) Editor" extension
2. Open any `.openapi.yaml` file
3. Right-click → Preview Swagger

### Generating Client SDKs

#### Generate TypeScript Client
```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript/Axios client
openapi-generator-cli generate \
  -i apps/api/openapi-specs/drive-insight-api.openapi.yaml \
  -g typescript-axios \
  -o packages/api-client

# Or generate TypeScript/Fetch client
openapi-generator-cli generate \
  -i apps/api/openapi-specs/drive-insight-api.openapi.yaml \
  -g typescript-fetch \
  -o packages/api-client
```

#### Generate Other Language Clients
```bash
# Python
openapi-generator-cli generate \
  -i apps/api/openapi-specs/drive-insight-api.openapi.yaml \
  -g python \
  -o clients/python

# Java
openapi-generator-cli generate \
  -i apps/api/openapi-specs/drive-insight-api.openapi.yaml \
  -g java \
  -o clients/java

# C#
openapi-generator-cli generate \
  -i apps/api/openapi-specs/drive-insight-api.openapi.yaml \
  -g csharp \
  -o clients/csharp
```

### API Testing with Postman

1. **Import into Postman**:
   - Open Postman
   - Click "Import" button
   - Select `drive-insight-api.openapi.yaml`
   - Postman will create a collection with all endpoints

2. **Set up environment variables**:
   ```json
   {
     "baseUrl": "http://localhost:3001/api",
     "accessToken": ""
   }
   ```

3. **Add authentication**:
   - Collection → Authorization
   - Type: Bearer Token
   - Token: `{{accessToken}}`

### Validation

#### Validate OpenAPI Specs
```bash
# Install validator
npm install -g @apidevtools/swagger-cli

# Validate master spec
swagger-cli validate apps/api/openapi-specs/drive-insight-api.openapi.yaml

# Validate all module specs
swagger-cli validate apps/api/openapi-specs/*.openapi.yaml
```

#### Lint OpenAPI Specs
```bash
# Install Spectral
npm install -g @stoplight/spectral-cli

# Lint specs
spectral lint apps/api/openapi-specs/drive-insight-api.openapi.yaml
```

## API Structure

### Authentication Flow
1. **Login**: `POST /auth/login`
   - Provide email and password
   - Receive JWT token and user info

2. **Use Token**: Include in all authenticated requests
   ```
   Authorization: Bearer <your-jwt-token>
   ```

3. **Complete Password Change**: `POST /auth/complete-password-change`
   - Required for new users with `must_change_password` flag

### Role-Based Access Control (RBAC)

| Role    | Permissions |
|---------|------------|
| Owner   | Full access to all operations, including user management |
| Manager | Can create users, view all users |
| Agent   | Can view users, manage own profile |

### Endpoints Summary

#### Authentication (`/auth`)
- `POST /auth/login` - User login (public)
- `POST /auth/complete-password-change` - Complete forced password change (authenticated)

#### Users (`/users`)
- `GET /users` - List all tenant users (authenticated)
- `POST /users` - Create user (owner/manager)
- `GET /users/whoami` - Get current user info (authenticated)
- `POST /users/invite` - Invite user (owner)
- `PATCH /users/{id}` - Update user (owner)
- `DELETE /users/{id}` - Delete user (owner)

#### Metrics (`/metrics`)
- `GET /metrics` - Prometheus metrics (public)

## Data Models

### Core Entities

#### User
- Multi-tenant user accounts
- Roles: owner, manager, agent
- Account statuses: invited, active, disabled
- Lifecycle tracking: invited_at, activated_at, disabled_at

#### Tenant
- Organization/dealership account
- Contains multiple users
- Branch support for multi-location dealerships

#### AgentProfile
- Agent-specific settings
- Working hours configuration
- Availability status

#### AuditLog
- Tracks all data changes
- Records before/after states
- Actor and tenant tracking

## Examples

### Authentication Example
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@dealership.com",
    "password": "SecurePassword123!"
  }'

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@dealership.com",
    "name": "John Doe",
    "role": "agent",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440000"
  }
}
```

### User Management Example
```bash
# Get all users (authenticated)
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer <your-token>"

# Invite user (owner only)
curl -X POST http://localhost:3001/api/users/invite \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newagent@dealership.com",
    "name": "New Agent",
    "role": "agent"
  }'

# Update user availability (owner only)
curl -X PATCH http://localhost:3001/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "availability": false
  }'
```

## Keeping Specs Up to Date

When adding or modifying API endpoints:

1. **Update the NestJS controller** with proper Swagger decorators:
   ```typescript
   @ApiOperation({ summary: 'Description of endpoint' })
   @ApiResponse({ status: 200, description: 'Success response' })
   @ApiResponse({ status: 400, description: 'Error response' })
   ```

2. **Update the corresponding OpenAPI spec file**:
   - Add/modify the endpoint in the module-specific spec
   - Update the master spec if needed

3. **Validate the changes**:
   ```bash
   swagger-cli validate apps/api/openapi-specs/*.openapi.yaml
   ```

4. **Test the endpoint** using the auto-generated Swagger UI:
   - Start the API server: `pnpm start:dev`
   - Visit: http://localhost:3001/api/docs

## Tools and Resources

### Recommended Tools
- [Swagger Editor](https://editor.swagger.io/) - Online OpenAPI editor
- [Redoc](https://github.com/Redocly/redoc) - Beautiful API documentation
- [Postman](https://www.postman.com/) - API testing platform
- [Insomnia](https://insomnia.rest/) - API testing tool
- [OpenAPI Generator](https://openapi-generator.tech/) - Client SDK generation

### VS Code Extensions
- OpenAPI (Swagger) Editor
- Swagger Viewer
- REST Client

### Links
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [NestJS OpenAPI Documentation](https://docs.nestjs.com/openapi/introduction)
- [Best Practices for OpenAPI](https://swagger.io/blog/api-design/openapi-best-practices/)

## Support

For questions or issues with the API specifications:
- Check the auto-generated Swagger docs at `/api/docs` (development only)
- Review the implementation in `apps/api/src/modules/`
- Contact the API team

## License

Proprietary - Drive Insight Platform
