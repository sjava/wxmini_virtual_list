const app = getApp();
const windowInfo = wx.getWindowInfo();
const screenHeight = windowInfo.windowHeight; // 屏幕高度

const gapInRpx = 30; // 列间距,单位rpx
const gapInPx = (gapInRpx / 750) * windowInfo.windowWidth; // 将rpx转换为px
const columnWidth = (windowInfo.windowWidth - gapInPx * 3) / 2; // 每列的宽度

Page({
  data: {
    visibleLeftData: [],
    visibleRightData: [],
    leftPlaceholderHeight: 0,
    rightPlaceholderHeight: 0,
    page: 1,
    loading: false,
    isInitialLoad: true,
    gapInRpx,
  },
  allData: [],
  leftColumnData: [],
  rightColumnData: [],
  leftColumnHeight: 0,
  rightColumnHeight: 0,

  throttledScrollHandler: null,

  onLoad: function () {
    this.throttledScrollHandler = this.throttle(this.handleScroll, 50);
    this.loadInitialData();
  },

  loadInitialData: async function () {
    await this.fetchData();
  },

  fetchData: function () {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: "Loading..." });

    return new Promise((resolve) => {
      setTimeout(() => {
        const newData = this.generateMockData();
        this.processData(newData);
        // Add small delay to ensure rendering is complete
        setTimeout(() => {
          this.setData({ loading: false, page: this.data.page + 1 });
          wx.hideLoading();
          resolve();
        }, 150);
      }, 500);
    });
  },

  generateMockData: function () {
    const data = [];
    for (let i = 0; i < 20; i++) {
      const height = Math.floor(Math.random() * 200 + 200);
      const id = this.allData.length + i;
      data.push({
        id: `id_${id}`,
        imageUrl: `https://placebear.com/300/${height}`,
        width: 300,
        height,
      });
    }
    return data;
  },

  processData: function (data) {
    let { leftColumnData, rightColumnData } = this;

    data.forEach((item) => {
      // 计算图片显示高度，保持宽高比,并加上5px的margin-bottom
      const displayHeight = (item.height / item.width) * columnWidth + 5;
      item.displayHeight = displayHeight;

      if (this.leftColumnHeight <= this.rightColumnHeight) {
        leftColumnData.push(item);
        this.leftColumnHeight += displayHeight;
      } else {
        rightColumnData.push(item);
        this.rightColumnHeight += displayHeight;
      }
    });

    this.allData = this.allData.concat(data);
    // 保存当前滚动位置，避免刷新后位置丢失
    const currentScrollTop = this.currentScrollTop || 0;

    if (this.data.isInitialLoad) {
      const scrollHeight = Math.max(
        this.leftColumnHeight,
        this.rightColumnHeight,
      );
      this.handleScroll({
        detail: { scrollTop: 0, scrollHeight: scrollHeight },
      });
      this.setData({ isInitialLoad: false });
    } else {
      setTimeout(() => {
        this.updateVisibleData(currentScrollTop);
      }, 50);
    }
  },

  // --- CORRECTED THROTTLE FUNCTION ---
  throttle: function (fn, delay) {
    let timer = null;
    return function () {
      const context = this;
      const args = arguments;
      if (!timer) {
        timer = setTimeout(() => {
          // The spread operator (...) is removed here. This is the fix.
          fn.apply(context, args);
          timer = null;
        }, delay);
      }
    };
  },

  onScroll: function (e) {
    this.throttledScrollHandler(e);
  },

  handleScroll: function (e) {
    if (!e || !e.detail) {
      // This guard is still useful for robustness but the root cause is fixed.
      console.error("handleScroll called with invalid event:", e);
      return;
    }

    const { scrollTop } = e.detail;
    this.currentScrollTop = scrollTop; // 保存当前滚动位置

    // Calculate actual scroll height based on column heights
    const actualScrollHeight = Math.max(
      this.leftColumnHeight,
      this.rightColumnHeight,
    );

    this.updateVisibleData(scrollTop);

    const threshold = 200;
    if (
      !this.data.loading &&
      this.data.page <= 10 &&
      scrollTop + screenHeight * 2 >= actualScrollHeight - threshold
    ) {
      this.loadMore();
    }
  },

  updateVisibleData: function (scrollTop) {
    const buffer = screenHeight * 2; // Render one screen height above and below the viewport
    const startIndex = scrollTop > 0 ? scrollTop - buffer : 0;
    const endIndex = scrollTop + screenHeight + buffer;

    // --- Left Column Calculation ---
    let leftVisibleData = [];
    let leftTop = 0;
    let leftPlaceholderHeight = 0;
    let lastVisibleLeftBottom = 0; // Track the bottom position of the last visible item

    for (let i = 0; i < this.leftColumnData.length; i++) {
      const item = this.leftColumnData[i];
      const itemBottom = leftTop + item.displayHeight;

      // Check if the item is within the visible range (viewport + buffer)
      if (itemBottom > startIndex && leftTop < endIndex) {
        // This is the first visible item, its top position is the top placeholder's height
        if (leftVisibleData.length === 0) {
          leftPlaceholderHeight = leftTop;
        }
        leftVisibleData.push(item);
        // Continuously update the bottom position of the last visible item
        lastVisibleLeftBottom = itemBottom;
      }
      leftTop = itemBottom;
    }

    // --- Right Column Calculation ---
    let rightVisibleData = [];
    let rightTop = 0;
    let rightPlaceholderHeight = 0;
    let lastVisibleRightBottom = 0; // Track for the right column

    for (let i = 0; i < this.rightColumnData.length; i++) {
      const item = this.rightColumnData[i];
      const itemBottom = rightTop + item.displayHeight;
      if (itemBottom > startIndex && rightTop < endIndex) {
        if (rightVisibleData.length === 0) {
          rightPlaceholderHeight = rightTop;
        }
        rightVisibleData.push(item);
        lastVisibleRightBottom = itemBottom;
      }
      rightTop = itemBottom;
    }

    // --- Update the page data ---
    this.setData({
      visibleLeftData: leftVisibleData,
      visibleRightData: rightVisibleData,
      leftPlaceholderHeight: leftPlaceholderHeight,
      rightPlaceholderHeight: rightPlaceholderHeight,
    });
  },

  loadMore: function () {
    this.fetchData();
  },
});
