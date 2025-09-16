// index.js
Page({
  data: {
    list: [], // 所有商品数据（含图片URL）
    column1: [], // 左列
    column2: [], // 右列
    heights: [], // 存储每个 item 的真实高度（关键！）
    column1Height: 0,
    column2Height: 0,
    topPlaceholderHeight: 0,
    bottomPlaceholderHeight: 0,
    loading: false,
    hasMore: true,

    // 虚拟列表参数
    screenHeight: 0,
    bufferScreens: 3,
    estimatedItemHeight: 300, // 预估高度（用于初始滚动计算）
  },

  onLoad() {
    this.getScreenHeight();
    this.loadMore();
  },

  getScreenHeight() {
    wx.getSystemInfo({
      success: (res) => this.setData({ screenHeight: res.windowHeight }),
    });
  },

  // 模拟加载数据（替换为真实接口）
  loadMore() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    setTimeout(() => {
      const newData = [];
      const startId = this.data.list.length;
      const mockImages = [
        "https://picsum.photos/400/600",
        "https://picsum.photos/400/400",
        "https://picsum.photos/400/500",
        "https://picsum.photos/400/700",
        "https://picsum.photos/400/300",
      ];

      // for (let i = 0; i < 10; i++) {
      //   // 假设每次加载10条新数据
      //   newData.push({
      //     id: startId + i,
      //     url: "https://example.com/image" + (startId + i) + ".jpg",
      //     height: 200, // 默认高度，实际高度会在图片加载后更新
      //   });
      // }

      for (let i = 0; i < 10; i++) {
        const url = mockImages[i % mockImages.length];
        newData.push({
          id: startId + i,
          url: url + `?v=${startId + i}`, // 防止缓存
          height: 200, // 初始高度为0，等待图片加载后测量
        });
      }

      const newList = [...this.data.list, ...newData];
      const newHeights = [
        ...this.data.heights,
        ...new Array(newData.length).fill(200),
      ];

      this.setData(
        {
          list: newList,
          heights: newHeights,
          loading: false,
        },
        () => {
          if (newList.length >= 1000) {
            this.setData({ hasMore: false });
          }
          // 初始加载或加载更多后，更新可视区域
          this.updateVisibleRange(this.lastScrollTop || 0);
        },
      );

      // ⚠️ 注意：此时图片还未加载，不能立即 redistributeColumns
      // 需等待图片加载完成（onImageLoad）后触发更新
    }, 1000);
  },

  // 图片加载完成，测量真实高度
  onImageLoad(e) {
    const index = e.currentTarget.dataset.index; // 图片对应 item 的 id
    const query = wx.createSelectorQuery().in(this);

    query
      .select(`#img-${index}`)
      .boundingClientRect((rect) => {
        if (!rect) return;

        // 获取图片实际高度 + 描述文字等其他部分高度
        const itemHeight = rect.height + 80; // 80 是 .desc + padding/margin 的预估

        // 更新 heights 数组
        const newHeights = [...this.data.heights];
        newHeights[index] = itemHeight;

        this.setData({ heights: newHeights });

        // 重新计算当前可视区域 & 重新分配瀑布流
        this.updateVisibleRange(this.lastScrollTop || 0);
      })
      .exec();
  },

  // 滚动事件
  onScroll(e) {
    const scrollTop = e.detail.scrollTop;
    this.lastScrollTop = scrollTop; // 缓存，供 onImageLoad 后使用
    this.updateVisibleRange(scrollTop);

    // ✅ 获取 scroll-view 内容总高度（关键！）
    const scrollHeight = this.getScrollHeight();
    const { screenHeight } = this.data;

    // ✅ 判断是否触底（预留 100px 提前加载，体验更好）
    if (scrollTop + screenHeight >= scrollHeight - 100) {
      if (!this.data.loading && this.data.hasMore) {
        console.log("🚀 触底，加载更多...");
        this.loadMore();
      }
    }
  },
  // 计算 scroll-view 内容的实际高度（所有 item 高度之和）
  getScrollHeight() {
    const {
      topPlaceholderHeight,
      bottomPlaceholderHeight,
      column1Height,
      column2Height,
    } = this.data;
    const contentHeight = Math.max(column1Height, column2Height);
    return topPlaceholderHeight + contentHeight + bottomPlaceholderHeight;
  },

  // 更新可视区域（虚拟列表核心）
  updateVisibleRange(scrollTop) {
    const { list, screenHeight, bufferScreens, estimatedItemHeight, heights } =
      this.data;

    if (list.length === 0) return;

    const bufferSize = screenHeight * bufferScreens;
    let startIndex = Math.floor(scrollTop / estimatedItemHeight);
    startIndex = Math.max(0, startIndex - 2);

    let renderCount = Math.ceil(bufferSize / estimatedItemHeight);
    let endIndex = Math.min(startIndex + renderCount, list.length);

    // ✅ 使用 heights 数组计算真实占位高度（更精准）
    let topHeight = 0;
    for (let i = 0; i < startIndex; i++) {
      topHeight += heights[i] || estimatedItemHeight; // 未测量用预估
    }

    let bottomHeight = 0;
    for (let i = endIndex; i < list.length; i++) {
      bottomHeight += heights[i] || estimatedItemHeight;
    }

    this.setData({
      startIndex,
      endIndex,
      topPlaceholderHeight: topHeight,
      bottomPlaceholderHeight: bottomHeight,
    });

    // 分配到双列
    this.redistributeColumns();
  },

  // 重新分配瀑布流列
  redistributeColumns() {
    const { list, startIndex, endIndex, heights } = this.data;
    const visibleList = list.slice(startIndex, endIndex);

    let col1 = [],
      col2 = [];
    let height1 = 0,
      height2 = 0;

    visibleList.forEach((item) => {
      const realHeight = heights[item.id] || 200; // 未测量先用默认值，避免布局错乱

      if (height1 <= height2) {
        col1.push(item);
        height1 += realHeight;
      } else {
        col2.push(item);
        height2 += realHeight;
      }
    });

    this.setData({
      column1: col1,
      column2: col2,
      column1Height: height1,
      column2Height: height2,
    });
  },
});
