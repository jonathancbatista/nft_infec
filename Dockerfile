# Stage 1: Build the frontend (Vite app)
FROM node:18 AS frontend-build

# Set working directory for frontend
WORKDIR /src/frontend

# Install dependencies and build the frontend app
COPY src/frontend/package.json src/frontend/yarn.lock ./
RUN yarn
COPY src/frontend ./
RUN yarn build

# Stage 2: Build the Go backend
FROM golang:1.22 AS backend-build

# Set working directory for backend
WORKDIR /src/backend

# Copy the Go module files and install dependencies
COPY src/backend/go.mod src/backend/go.sum ./
RUN go mod tidy

# Copy the Go source code
COPY src/backend ./

# Set build flags and build the Go application
RUN GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o /usr/local/bin/app -a .

# Stage 3: Final Go application image
FROM golang:1.22-alpine

# Set working directory for Go app
WORKDIR /src/backend

# Copy the frontend build to the final image (Vite app)
COPY --from=frontend-build /src/frontend/dist /src/frontend/dist

# Copy the Go binary from the backend build stage
COPY --from=backend-build /usr/local/bin/app /usr/local/bin/app

# Expose the ports (Go app: 8080)
EXPOSE 8080

# Run the Go application
CMD ["/usr/local/bin/app"]
