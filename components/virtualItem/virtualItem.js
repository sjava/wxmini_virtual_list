// components/VirtualItem/index.js
Component({
  properties: {
    virtualId: {
      type: String,
      value: "",
    },
    observeDistance: {
      type: Number,
      value: 300, // 提前300px加载
    },
  },

  data: {
    isShow: false,
    height: 0,
  },

  lifetimes: {
    attached() {
      this.observePage();
    },
  },

  methods: {
    // 获取当前内容实际高度，设置给占位元素
    getCurrentItemHeight() {
      const query = this.createSelectorQuery();
      query.select(`#${this.data.virtualId}`).boundingClientRect();
      query.exec((res) => {
        if (res[0]) {
          this.setData({
            height: res[0].height,
          });
        }
        this.observePage(); // 重新监听
      });
    },

    // 监听元素是否进入视口
    observePage() {
      const { virtualId, observeDistance } = this.data;
      const observer = wx.createIntersectionObserver(this, {
        thresholds: [0, 1],
      });

      observer
        .relativeToViewport({
          top: observeDistance,
          bottom: observeDistance,
        })
        .observe(`#${virtualId}`, (res) => {
          this.setData({
            isShow: res.intersectionRatio > 0 && res.isIntersecting,
          });
        });
    },
  },
});
