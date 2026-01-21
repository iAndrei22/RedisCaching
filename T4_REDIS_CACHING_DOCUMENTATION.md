# T4 – Caching and Data Acceleration with Redis

## Overview

Redis-based caching layer to accelerate MongoDB queries. Demonstrates cache-aside, write-through strategies, and real-time performance monitoring.

### System Architecture

```mermaid
graph TB
    Client["Frontend Client"]
    Express["Express.js Server"]
    Redis["Redis Cache<br/>100MB, LRU Policy"]
    MongoDB["MongoDB Database"]
    Metrics["Metrics Tracker"]
    Dashboard["Metrics Dashboard"]
    
    Client -->|API Requests| Express
    Express -->|GET/SET/DEL| Redis
    Express -->|Query/Write| MongoDB
    Express -->|Track Operations| Metrics
    Metrics -->|Store| Redis
    Dashboard -->|GET /api/metrics| Express
    Client -->|View Metrics| Dashboard
    
    style Redis fill:#e74c3c
    style MongoDB fill:#4a90e2
    style Express fill:#2ecc71
```

---

## Caching Layer Implementation

**Purpose**: Accelerate frequent MongoDB queries (user task lists, leaderboards)  
**Architecture**: Express.js application → Redis cache → MongoDB database  
**Performance Gain**: 10-50x faster (cache: ~1-5ms vs database: ~30-100ms)  
**Integration**: Transparent caching layer; application checks Redis before MongoDB

---

## Cache Strategies

### 1. Cache-Aside (Lazy Loading)

```mermaid
graph TD
    A["Application Request<br/>GET /tasks/{userId}"] -->|Check Cache| B{"Redis HIT?"}
    B -->|YES| C["Return Cached Data<br/>~1-5ms"]
    B -->|NO| D["Query MongoDB<br/>~30-100ms"]
    D --> E["Store in Redis<br/>TTL: 180s"]
    E --> F["Return Data"]
    C --> G["End"]
    F --> G
    
    style A fill:#2ecc71
    style B fill:#f39c12
    style C fill:#27ae60
    style D fill:#e74c3c
    style E fill:#e74c3c
```

**How it works**:
1. Application checks Redis for cached data
2. **Cache HIT**: Return data immediately (~1-5ms)
3. **Cache MISS**: Query MongoDB → store in Redis → return data
4. Subsequent requests hit cache until TTL expires (180s)

**Redis Operations**:
- `GET user_tasks_{userId}` - Check cache
- `SET user_tasks_{userId} {data} EX 180` - Store with TTL

**Implementation**: [task.controller.js#L36-L58](backend/src/controllers/task.controller.js#L36-L58)

### 2. Write-Through (Synchronous Write)

```mermaid
graph TD
    A["Application Request<br/>POST /tasks"] -->|Write| B["MongoDB Write<br/>Primary Storage"]
    B -->|Success| C["Redis Update<br/>Secondary Cache"]
    C -->|Success| D["Return Success"]
    B -->|Fail| E["Return Error"]
    D --> F["End"]
    E --> F
    
    style A fill:#2ecc71
    style B fill:#3498db
    style C fill:#e74c3c
    style D fill:#27ae60
    style E fill:#c0392b
```

**How it works**:
1. Write data to MongoDB (primary storage)
2. Immediately write to Redis (secondary cache)
3. Both operations succeed together; ensures synchronization

**Redis Operations**:
- `GET user_tasks_{userId}` - Fetch existing cache
- `SET user_tasks_{userId} {updated_data} EX 180` - Update cache

**Implementation**: [task.controller.js#L14-L33](backend/src/controllers/task.controller.js#L14-L33)

### 3. Cache Invalidation

```mermaid
graph TD
    A["Data Update/Delete<br/>MongoDB"] -->|Invalidate| B["DELETE Redis Key<br/>user_tasks_{userId}"]
    B -->|Next READ| C{"Cache HIT?"}
    C -->|NO| D["Query Fresh from DB"]
    D --> E["Repopulate Cache"]
    C -->|YES| F["Return Cached Data"]
    E --> G["Return Data"]
    
    style A fill:#e74c3c
    style B fill:#e74c3c
    style D fill:#2ecc71
    style E fill:#2ecc71
```

**How it works**:
1. Update or delete data in MongoDB
2. Immediately delete Redis cache key
3. Next read triggers cache MISS → fresh data fetched

**Redis Operations**:
- `DEL user_tasks_{userId}` - Remove stale cache
- Smart invalidation: Only clears if data actually changed

**Implementation**: [task.controller.js#L59-L94](backend/src/controllers/task.controller.js#L59-L94)

---

## Redis Data Structures

```mermaid
graph TB
    subgraph Strings["Strings - Key-Value Pairs"]
        S1["Key: user_tasks_{userId}<br/>Value: JSON Array<br/>TTL: 180s"]
        S2["Example:<br/>user_tasks_123<br/>[{id: 1, title: 'Task1',...}]"]
    end
    
    subgraph SortedSets["Sorted Sets - Leaderboard"]
        Z1["Key: user_leaderboard<br/>Members: User IDs<br/>Scores: Total Points<br/>TTL: 180s"]
        Z2["Example:<br/>ZADD 5000 user_1<br/>ZADD 4500 user_2"]
    end
    
    subgraph Hashes["Hashes - Metrics"]
        H1["Metrics Storage<br/>Hits/Misses Counter<br/>Latency Data"]
    end
    
    style S1 fill:#e74c3c
    style S2 fill:#ffebee
    style Z1 fill:#e74c3c
    style Z2 fill:#ffebee
    style H1 fill:#e74c3c
```

### Strings (Key-Value)
**Use case**: Cache JSON arrays of MongoDB documents  
**Key pattern**: `user_tasks_{userId}`  
**Value**: JSON-stringified task list  
**TTL**: 180 seconds  
**Operations**: `GET`, `SET`, `DEL`

### Sorted Sets (Rankings)
**Use case**: Cache leaderboard rankings  
**Key**: `user_leaderboard`  
**Members**: User IDs ranked by score (total points)  
**TTL**: 180 seconds  
**Operations**: `ZADD`, `ZRANGE`, `DEL`  
**Special**: Caches ranking order only; points fetched fresh

---

## Cache Performance Metrics

```mermaid
graph LR
    A["Request"] -->|Cache HIT| B["Redis<br/>1-5ms"]
    A -->|Cache MISS| C["MongoDB<br/>30-100ms"]
    
    B --> D["⚡ 10-50x Faster"]
    
    style B fill:#27ae60
    style C fill:#e74c3c
    style D fill:#f39c12
```

**What's tracked**:
- Cache hits and misses (per operation type)
- Latency for each operation (milliseconds)
- Hit ratio: `(Hits / Total Requests) × 100`
- Latency improvement: `((DB_Time - Cache_Time) / DB_Time) × 100`

**Metrics collection**: [metricsTracker.js](backend/src/utils/metricsTracker.js)  
**API endpoint**: `GET /api/metrics`  
**Storage**: Last 100 operations in memory

---

## Memory Management

```mermaid
graph TD
    A["Redis Cache Entry"] -->|Set TTL| B["180 Seconds"]
    B -->|Timer Expires| C["Auto-Remove Key"]
    
    D["Memory Usage"] -->|Reaches 100MB| E["LRU Eviction Triggered"]
    E -->|Remove| F["Least Recently Used Key"]
    F -->|Freed Space| G["New Data Can Be Added"]
    
    style A fill:#e74c3c
    style B fill:#f39c12
    style C fill:#27ae60
    style E fill:#f39c12
    style F fill:#c0392b
```

### TTL (Time-To-Live)
**Configuration**: 180 seconds on all cache keys  
**Behavior**: Redis automatically expires and removes old keys  
**Benefit**: Prevents indefinite stale data; forces periodic refresh

### LRU Eviction Policy
**Configuration** ([app.js#L20-L21](backend/src/app.js#L20-L21)):
```javascript
await redisClient.configSet('maxmemory', '100mb');
await redisClient.configSet('maxmemory-policy', 'allkeys-lru');
```

**Behavior**:
- Max memory: 100MB
- When limit reached: Remove least recently used keys automatically
- Frequently accessed data stays in cache

---

## Cache Invalidation Policies

```mermaid
graph LR
    A["Data Modified/<br/>Deleted"] -->|Invalidate| B["Redis DEL<br/>Cache Key"]
    B -->|Next Request| C{"Cache Hit?"}
    C -->|No| D["Fetch Fresh<br/>from DB"]
    C -->|Yes| E["Return<br/>Cached"]
    D --> F["Update Cache"]
    
    style A fill:#e74c3c
    style B fill:#e74c3c
    style D fill:#27ae60
    style F fill:#27ae60
```

**On data deletion**: `DEL` cache key immediately  
**On data update**: `DEL` cache key; next read repopulates  
**Smart invalidation**: Leaderboard only invalidates if ranking order changes  
**Timing**: Synchronous (immediate) after MongoDB write  
**Guarantee**: No stale cache after modifications

---

## Metrics Dashboard

```mermaid
graph TB
    subgraph Operations["Cache Operations"]
        O1["Cache HIT<br/>~1-5ms"]
        O2["Cache MISS<br/>Query DB"]
        O3["Cache SET<br/>Store Data"]
        O4["Cache DEL<br/>Invalidate"]
    end
    
    subgraph Tracker["Metrics Tracker"]
        T1["Track Hits/Misses"]
        T2["Measure Latency"]
        T3["Calculate Hit Ratio"]
        T4["Store Last 100 Ops"]
    end
    
    subgraph Display["Dashboard Display"]
        D1["Hit/Miss Ratio<br/>Doughnut Chart"]
        D2["Latency Comparison<br/>Bar Chart"]
        D3["Performance %<br/>Improvement"]
        D4["Operations Table"]
    end
    
    O1 --> T1
    O2 --> T1
    O3 --> T2
    O4 --> T2
    T1 --> T3
    T2 --> T4
    T3 --> D1
    T4 --> D2
    T3 --> D3
    T4 --> D4
    
    style Operations fill:#2ecc71
    style Tracker fill:#3498db
    style Display fill:#f39c12
```

**Access**: `http://localhost:3000/metrics-dashboard`  
**Implementation**: [CacheMetrics.html](frontend/CacheMetrics.html)

**Displays**: Hit ratio, total hits/misses, average latencies, performance improvement percentage  
**Visualizations**: Doughnut chart (hit/miss distribution), bar chart (latency comparison), operations table  
**Features**: Real-time updates with Chart.js, manual refresh and clear buttons