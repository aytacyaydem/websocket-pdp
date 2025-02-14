const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// `public` klasörünü statik olarak serve edin
app.use(express.static(path.join(__dirname, "public")));

// Her ürün için izleyici listesini tutmak için bir obje
const productViewers = {};

// İzleyici sayısını canlı olarak görmek için endpoint
app.get("/api/live-viewers", (req, res) => {
  const counts = Object.fromEntries(
    Object.entries(productViewers).map(([productId, viewers]) => [
      productId,
      viewers.size,
    ])
  );
  res.json(counts);
});

io.on("connection", (socket) => {
  let currentProductId = null;

  const sendViewerCount = (productId, excludeSocketId) => {
    const viewers = Array.from(productViewers[productId] || []);
    const filteredViewers = viewers.filter((id) => id !== excludeSocketId);
    io.to(socket.id).emit("viewerCount", filteredViewers.length);
  };

  socket.on("joinProduct", (productId) => {
    if (currentProductId && productViewers[currentProductId]) {
      productViewers[currentProductId].delete(socket.id);
      sendViewerCount(currentProductId, socket.id);
      socket.leave(currentProductId);
    }

    currentProductId = productId;
    socket.join(productId);

    if (!productViewers[productId]) {
      productViewers[productId] = new Set();
    }
    productViewers[productId].add(socket.id);

    sendViewerCount(productId, socket.id);
  });

  socket.on("disconnect", () => {
    if (currentProductId && productViewers[currentProductId]) {
      productViewers[currentProductId].delete(socket.id);
      sendViewerCount(currentProductId, socket.id);
    }
  });
});

const PORT = process.env.PORT || 8881;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Ana Sayfa: http://localhost:${PORT}`);
  console.log(
    `Canlı İzleyici Sayısı: http://localhost:${PORT}/api/live-viewers`
  );
});
