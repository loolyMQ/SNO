export var CacheLevel;
(function (CacheLevel) {
    CacheLevel["L1_MEMORY"] = "l1_memory";
    CacheLevel["L2_REDIS"] = "l2_redis";
    CacheLevel["L3_CDN"] = "l3_cdn";
})(CacheLevel || (CacheLevel = {}));
export var CacheStrategy;
(function (CacheStrategy) {
    CacheStrategy["WRITE_THROUGH"] = "write_through";
    CacheStrategy["WRITE_BEHIND"] = "write_behind";
    CacheStrategy["WRITE_AROUND"] = "write_around";
    CacheStrategy["CACHE_ASIDE"] = "cache_aside";
})(CacheStrategy || (CacheStrategy = {}));
export var CacheEvictionPolicy;
(function (CacheEvictionPolicy) {
    CacheEvictionPolicy["LRU"] = "lru";
    CacheEvictionPolicy["LFU"] = "lfu";
    CacheEvictionPolicy["FIFO"] = "fifo";
    CacheEvictionPolicy["TTL"] = "ttl";
    CacheEvictionPolicy["RANDOM"] = "random";
})(CacheEvictionPolicy || (CacheEvictionPolicy = {}));
//# sourceMappingURL=types.js.map