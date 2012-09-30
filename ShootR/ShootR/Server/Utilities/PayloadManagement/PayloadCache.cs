﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ShootR
{
    public class PayloadCache
    {
        Dictionary<string, Dictionary<int, bool>> _lastCache;
        Dictionary<string, Dictionary<int, bool>> _currentCache;

        public PayloadCache()
        {
            // Initiate base cache containers
            _currentCache = new Dictionary<string, Dictionary<int, bool>>();
            _lastCache = new Dictionary<string, Dictionary<int, bool>>();
        }

        public void StartNextPayloadCache()
        {
            _lastCache = _currentCache;
            _currentCache = new Dictionary<string, Dictionary<int, bool>>();
        }

        public void CreateCacheFor(string connectionID)
        {
            _currentCache.Add(connectionID, new Dictionary<int, bool>());
        }

        public void Cache(string connectionID, Collidable obj)
        {
            _currentCache[connectionID].Add(obj.ServerID(), true);
        }

        public bool ExistedLastPayload(string connectionID, Collidable obj)
        {
            return _lastCache.ContainsKey(connectionID) && _lastCache[connectionID].ContainsKey(obj.ServerID());
        }
    }
}