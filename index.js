const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Her ürün için kullanıcı sayısını tutmak için bir obje
const productViewers = {};

// İzleyici sayısını canlı olarak görmek için endpoint
app.get("/api/live-viewers", (req, res) => {
  res.json(productViewers);
});

io.on("connection", (socket) => {
  let currentProductId = null;

  socket.on("joinProduct", (productId) => {
    if (currentProductId) {
      if (productViewers[currentProductId]) {
        productViewers[currentProductId] -= 1;
        io.to(currentProductId).emit(
          "viewerCount",
          productViewers[currentProductId]
        );
      }
      socket.leave(currentProductId);
    }

    currentProductId = productId;
    socket.join(productId);

    if (!productViewers[productId]) {
      productViewers[productId] = 0;
    }
    productViewers[productId] += 1;

    io.to(productId).emit("viewerCount", productViewers[productId]);
  });

  socket.on("disconnect", () => {
    if (currentProductId && productViewers[currentProductId]) {
      productViewers[currentProductId] -= 1;
      io.to(currentProductId).emit(
        "viewerCount",
        productViewers[currentProductId]
      );
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
