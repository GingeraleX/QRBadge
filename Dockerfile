# 1) Use an official Node LTS image
FROM node:20.9

# 2) Create and use the /usr/src/app directory
WORKDIR /usr/src/app

# 3) Copy package.json and package-lock.json first
COPY package*.json ./

# 4) Install dependencies
RUN npm install

# 5) Copy the rest of the code
COPY . .

# 6) Build Tailwind (assuming you have a "build:tailwind" script in package.json)
RUN npm run build

# 7) Expose the port (e.g., 3000)
EXPOSE 3000

# 8) Start the application
CMD ["npm", "start"]
