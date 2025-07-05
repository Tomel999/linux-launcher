const https = require('https');
const fs = require('fs-extra');
const path = require('path');

const MODRINTH_API_BASE = 'https://api.modrinth.com/v2';

const MOD_CONFIGS = {
    '1.19.2': [
        { modId: 'lhGA9TYQ', name: 'Architectury' },
        { modId: 'g96Z4WVZ', name: 'BadOptimizations' },
        { modId: 'M08ruV16', name: 'Bobby' },
        { modId: 'kYq5qkSL', name: 'Borderless Mining' },
        { modId: 'vWIaVOTE', name: 'brb' },
        { modId: '485Cv9lY', name: 'Clear Water' },
        { modId: '9s6osm5g', name: 'Cloth Config' },
        { modId: 'h3r1moh7', name: 'cmdkeybind' },
        { modId: 'i090SePT', name: 'Disable Insecure Chat Toast' },
        { modId: 'LQ3K71Q1', name: 'Dynamic FPS' },
        { modId: 'q7vRRpxU', name: 'Emoji Type' },
        { modId: 'NNAgCjsB', name: 'Entity Culling' },
        { modId: 'ihnBJ6on', name: 'Entity View Distance' },
        { modId: 'P7dR8mSH', name: 'Fabric API' },
        { modId: 'Ha28R6CL', name: 'Fabric Language Kotlin' },
        { modId: 'WNcgffMw', name: 'Fast Chest' },
        { modId: 'x1hIzbuY', name: 'FastQuit' },
        { modId: 'uXXizFIs', name: 'FerriteCore' },
        { modId: 'ErpAAAaf', name: 'Interactic' },
        { modId: 'fQEb0iXm', name: 'Krypton' },
        { modId: '2ecVyZ49', name: 'Ksyxis' },
        { modId: 'hvFnDODi', name: 'LazyDFU' },
        { modId: 'NRjRiSSD', name: 'Memory Leak Fix' },
        { modId: 'nmDcB62a', name: 'ModernFix' },
        { modId: 'mOgUt4GM', name: 'Mod Menu' },
        { modId: '8qkXwOnk', name: 'More Chat History' },
        { modId: '51shyZVL', name: 'More Culling' },
        { modId: 'bWkJ7ejc', name: 'NoRefreshScroll' },
        { modId: '6xKUDQcB', name: 'No Resource Pack Warnings' },
        { modId: 'MPCX6s5C', name: 'Not Enough Animations' },
        { modId: 'yM94ont6', name: 'Not Enough Crashes' },
        { modId: 'mCNtqH4S', name: 'No Tutorial Toasts' },
        { modId: 'ccKDOlHs', name: 'owo-lib' },
        { modId: 'J1nJ0y6I', name: 'Recipe Unlocker' },
        { modId: 'Nv2fQJo5', name: 'ReplayMod' },
        { modId: 'M1953qlQ', name: 'Resourceful Config' },
        { modId: 'iqK5uv72', name: 'Server Pinger Fixer' },
        { modId: '2M01OLQq', name: 'Shulker Box Tooltip' },
        { modId: '1cfO6J6t', name: 'smallpop' },
        { modId: 'nKcekY2P', name: 'Smoke Suppression' },
        { modId: 'FWumhS4T', name: 'Smooth Boot' },
        { modId: 'ydZic5r4', name: 'Smooth Swapping' },
        { modId: 'H8CaAYZC', name: 'Starlight' },
        { modId: 'T9FDHbY5', name: 'Status Effect Timer' },
        { modId: 'jxuxsA0D', name: 'TieFix' },
        { modId: '1itdse3V', name: 'Time Changer' },
        { modId: 'NpPKJQg6', name: 'Vectorientation' }

    ],
    '1.20.1': [
        { modId: 'lhGA9TYQ', name: 'Architectury' },
        { modId: 'E9SxgOCE', name: 'Auto Sprint Fix' },
        { modId: 'g96Z4WVZ', name: 'BadOptimizations' },
        { modId: 'setnaI8o', name: 'Bobber Begone' },
        { modId: 'M08ruV16', name: 'Bobby' },
        { modId: 'kYq5qkSL', name: 'Borderless Mining' },
        { modId: 'vWIaVOTE', name: 'brb' },
        { modId: 'otVJckYQ', name: 'CIT Resewn' },
        { modId: '485Cv9lY', name: 'Clear Water' },
        { modId: '9s6osm5g', name: 'Cloth Config' },
        { modId: 'h3r1moh7', name: 'cmdkeybind' },
        { modId: 'uZAcFHLd', name: 'Custom FOV' },
        { modId: 'QwxR6Gcd', name: 'Debugify' },
        { modId: 'LQ3K71Q1', name: 'Dynamic FPS' },
        { modId: 'q7vRRpxU', name: 'Emoji Type' },
        { modId: 'BVzZfTc1', name: 'Entity Texture Features' },
        { modId: 'NNAgCjsB', name: 'Entity Culling' },
        { modId: 'ihnBJ6on', name: 'Entity View Distance' },
        { modId: 'P7dR8mSH', name: 'Fabric API' },
        { modId: 'Ha28R6CL', name: 'Fabric Language Kotlin' },
        { modId: 'YBz7DOs8', name: 'FabricSkyboxes' },
        { modId: 'ncKjyGm3', name: 'Fadeless' },
        { modId: 'WNcgffMw', name: 'Fast Chest' },
        { modId: 'x1hIzbuY', name: 'FastQuit' },
        { modId: 'uXXizFIs', name: 'FerriteCore' },
        { modId: 'HpdHOPOp', name: 'fsb-interop' },
        { modId: 'hYykXjDp', name: 'Fzzy Config' },
        { modId: '5ZwdcRci', name: 'ImmediatelyFast' },
        { modId: 'Orvt0mRa', name: 'Indium' },
        { modId: 'ErpAAAaf', name: 'Interactic' },
        { modId: 'fQEb0iXm', name: 'Krypton' },
        { modId: '2ecVyZ49', name: 'Ksyxis' },
        { modId: 'uLbm7CG6', name: 'Language Reload' },
        { modId: 'hvFnDODi', name: 'LazyDFU' },
        { modId: 'gvQqBUqZ', name: 'Lithium' },
        { modId: 'NRjRiSSD', name: 'Memory Leak Fix' },
        { modId: 'nmDcB62a', name: 'ModernFix' },
        { modId: 'mOgUt4GM', name: 'Mod Menu' },
        { modId: '51shyZVL', name: 'More Culling' },
        { modId: 'KuNKN7d2', name: 'Noisium' },
        { modId: 'bWkJ7ejc', name: 'NoRefreshScroll' },
        { modId: '6xKUDQcB', name: 'No Resource Pack Warnings' },
        { modId: 'MPCX6s5C', name: 'Not Enough Animations' },
        { modId: 'yM94ont6', name: 'Not Enough Crashes' },
        { modId: 'ccKDOlHs', name: 'owo-lib' },
        { modId: 'RSeLon5O', name: 'Particle Core' },
        { modId: 'J1nJ0y6I', name: 'Recipe Unlocker' },
        { modId: 'Bh37bMuy', name: 'Reeses Sodium Options' },
        { modId: 'Nv2fQJo5', name: 'ReplayMod' },
        { modId: 'M1953qlQ', name: 'Resourceful Config' },
        { modId: 'iqK5uv72', name: 'Server Pinger Fixer' },
        { modId: '2M01OLQq', name: 'Shulker Box Tooltip' },
        { modId: '1cfO6J6t', name: 'smallpop' },
        { modId: 'nKcekY2P', name: 'Smoke Suppression' },
        { modId: 'trr0scVt', name: 'Smooth Scrolling Refurbished' },
        { modId: 'ydZic5r4', name: 'Smooth Swapping' },
        { modId: 'PtjYWJkn', name: 'Sodium Extra' },
        { modId: 'AANobbMI', name: 'Sodium' },
        { modId: 'H8CaAYZC', name: 'Starlight' },
        { modId: 'T9FDHbY5', name: 'Status Effect Timer' },
        { modId: 'vSEH1ERy', name: 'ThreadTweak' },
        { modId: 'jxuxsA0D', name: 'TieFix' },
        { modId: '1itdse3V', name: 'Time Changer' },
        { modId: '5HUqEye3', name: 'VanillaIcecreamFix' },
        { modId: 'NpPKJQg6', name: 'Vectorientation' },
        { modId: 'rIC2XJV4', name: 'ViaFabricPlus' },
        { modId: '1eAoo2KR', name: 'Yet Another Config Lib' },
        { modId: 'w7ThoJFB', name: 'Zoomify' }

    ],
'1.20.6': [

        { "modId": "lhGA9TYQ", "name": "Architectury" },
        { "modId": "E9SxgOCE", "name": "Auto Sprint Fix" },
        { "modId": "g96Z4WVZ", "name": "BadOptimizations" },
        { "modId": "m5T5xmUy", "name": "BetterGrassify" },
        { "modId": "setnaI8o", "name": "Bobber Begone" },
        { "modId": "VSNURh3q", "name": "c2me" },
        { "modId": "9s6osm5g", "name": "Cloth Config" },
        { "modId": "65UyswbY", "name": "commandkeys" },
        { "modId": "uZAcFHLd", "name": "Custom FOV" },
        { "modId": "QwxR6Gcd", "name": "Debugify" },
        { "modId": "LQ3K71Q1", "name": "Dynamic FPS" },
        { "modId": "q7vRRpxU", "name": "Emoji Type" },
        { "modId": "OVuFYfre", "name": "Enhanced Block Entities" },
        { "modId": "BVzZfTc1", "name": "Entity Texture Features" },
        { "modId": "NNAgCjsB", "name": "Entity Culling" },
        { "modId": "DynYZEae", "name": "Exordium" },
        { "modId": "P7dR8mSH", "name": "Fabric API" },
        { "modId": "Ha28R6CL", "name": "Fabric Language Kotlin" },
        { "modId": "YBz7DOs8", "name": "FabricSkyboxes" },
        { "modId": "x1hIzbuY", "name": "FastQuit" },
        { "modId": "uXXizFIs", "name": "FerriteCore" },
        { "modId": "HpdHOPOp", "name": "FabricSkyBoxes Interop" },
        { "modId": "hYykXjDp", "name": "Fzzy Config" },
        { "modId": "5ZwdcRci", "name": "ImmediatelyFast" },
        { "modId": "Orvt0mRa", "name": "Indium" },
        { "modId": "fQEb0iXm", "name": "Krypton" },
        { "modId": "2ecVyZ49", "name": "Ksyxis" },
        { "modId": "uLbm7CG6", "name": "Language Reload" },
        { "modId": "hvFnDODi", "name": "LazyDFU" },
        { "modId": "gvQqBUqZ", "name": "Lithium" },
        { "modId": "nmDcB62a", "name": "ModernFix" },
        { "modId": "mOgUt4GM", "name": "Mod Menu" },
        { "modId": "8qkXwOnk", "name": "MoreChatHistory" },
        { "modId": "KuNKN7d2", "name": "Noisium" },
        { "modId": "bWkJ7ejc", "name": "NoRefreshScroll" },
        { "modId": "6xKUDQcB", "name": "No Resource Pack Warnings" },
        { "modId": "MPCX6s5C", "name": "Not Enough Animations" },
        { "modId": "yM94ont6", "name": "Not Enough Crashes" },
        { "modId": "aXf2OSFU", "name": "Ok Zoomer" },
        { "modId": "ccKDOlHs", "name": "owo-lib" },
        { "modId": "RSeLon5O", "name": "Particle Core" },
        { "modId": "J1nJ0y6I", "name": "Recipe Unlocker" },
        { "modId": "Bh37bMuy", "name": "Reeses Sodium Options" },
        { "modId": "Nv2fQJo5", "name": "ReplayMod" },
        { "modId": "M1953qlQ", "name": "Resourceful Config" },
        { "modId": "iqK5uv72", "name": "Server Pinger Fixer" },
        { "modId": "2M01OLQq", "name": "Shulker Box Tooltip" },
        { "modId": "1cfO6J6t", "name": "smallpop" },
        { "modId": "nKcekY2P", "name": "Smoke Suppression" },
        { "modId": "trr0scVt", "name": "Smooth Scrolling Refurbished" },
        { "modId": "PtjYWJkn", "name": "Sodium Extra" },
        { "modId": "AANobbMI", "name": "Sodium" },
        { "modId": "T9FDHbY5", "name": "Status Effect Timer" },
        { "modId": "vSEH1ERy", "name": "ThreadTweak" },
        { "modId": "NpPKJQg6", "name": "Vectorientation" },
        { "modId": "rIC2XJV4", "name": "ViaFabricPlus" },
        { "modId": "1eAoo2KR", "name": "Yet Another Config Lib" }
],
    '1.21.1': [
        { modId: 'lhGA9TYQ', name: 'Architectury' },
        { modId: 'g96Z4WVZ', name: 'BadOptimizations' },
        { modId: 'm5T5xmUy', name: 'BetterGrassify' },
        { modId: 'M08ruV16', name: 'Bobby' },
        { modId: 'UIexcMP1', name: 'Borderless Fullscreen' },
        { modId: 'vWIaVOTE', name: 'brb' },
        { modId: 'otVJckYQ', name: 'CIT Resewn' },
        { modId: '485Cv9lY', name: 'Clear Water' },
        { modId: '9s6osm5g', name: 'Cloth Config' },
        { modId: '65UyswbY', name: 'commandkeys' },
        { modId: 'QwxR6Gcd', name: 'Debugify' },
        { modId: 'LQ3K71Q1', name: 'Dynamic FPS' },
        { modId: 'q7vRRpxU', name: 'Emoji Type' },
        { modId: 'OVuFYfre', name: 'Enhanced Block Entities' },
        { modId: 'BVzZfTc1', name: 'Entity Texture Features' },
        { modId: 'NNAgCjsB', name: 'Entity Culling' },
        { modId: 'ihnBJ6on', name: 'Entity View Distance' },
        { modId: 'P7dR8mSH', name: 'Fabric API' },
        { modId: 'Ha28R6CL', name: 'Fabric Language Kotlin' },
        { modId: 'YBz7DOs8', name: 'FabricSkyboxes' },
        { modId: 'x1hIzbuY', name: 'FastQuit' },
        { modId: 'uXXizFIs', name: 'FerriteCore' },
        { modId: '4das1Fjq', name: 'Flashback' },
        { modId: 'blWBX5n1', name: "forcecloseloadingscreen" },
        { modId: 'HpdHOPOp', name: 'fsb-interop' },
        { modId: 'hYykXjDp', name: 'Fzzy Config' },
        { modId: '5ZwdcRci', name: 'ImmediatelyFast' },
        { modId: 'fQEb0iXm', name: 'Krypton' },
        { modId: '2ecVyZ49', name: 'Ksyxis' },
        { modId: 'uLbm7CG6', name: 'Language Reload' },
        { modId: 'gvQqBUqZ', name: 'Lithium' },
        { modId: 'nmDcB62a', name: 'ModernFix' },
        { modId: 'mOgUt4GM', name: 'Mod Menu' },
        { modId: '8qkXwOnk', name: 'More Chat History' },
        { modId: 'KuNKN7d2', name: 'Noisium' },
        { modId: 'bWkJ7ejc', name: 'NoRefreshScroll' },
        { modId: '6xKUDQcB', name: 'No Resource Pack Warnings' },
        { modId: 'MPCX6s5C', name: 'Not Enough Animations' },
        { modId: 'yM94ont6', name: 'Not Enough Crashes' },
        { modId: 'aXf2OSFU', name: 'Ok Zoomer' },
        { modId: 'ccKDOlHs', name: 'owo-lib' },
        { modId: 'RSeLon5O', name: 'Particle Core' },
        { modId: 'J1nJ0y6I', name: 'Recipe Unlocker' },
        { modId: 'Bh37bMuy', name: "Reeses Sodium Options" },
        { modId: 'M1953qlQ', name: 'Resourceful Config' },
        { modId: 'Ps1zyz6x', name: 'ScalableLux' },
        { modId: 'iqK5uv72', name: 'Server Pinger Fixer' },
        { modId: '2M01OLQq', name: 'Shulker Box Tooltip' },
        { modId: 'nKcekY2P', name: 'Smoke Suppression' },
        { modId: 'trr0scVt', name: 'Smooth Scrolling Refurbished' },
        { modId: 'uvlgIwBD', name: 'Smooth Skies' },
        { modId: 'PtjYWJkn', name: 'Sodium Extra' },
        { modId: 'AANobbMI', name: 'Sodium' },
        { modId: 'T9FDHbY5', name: 'Status Effect Timer' },
        { modId: 'vSEH1ERy', name: 'ThreadTweak' },
        { modId: '1itdse3V', name: 'Time Changer' },
        { modId: '1cfO6J6t', name: 'totemtweaks' },
        { modId: '5HUqEye3', name: 'VanillaIcecreamFix' },
        { modId: 'NpPKJQg6', name: 'Vectorientation' },
        { modId: 'rIC2XJV4', name: 'ViaFabricPlus' },
        { modId: '1eAoo2KR', name: 'Yet Another Config Lib' }
    ],
    '1.21.3': [
        { "modId": "lhGA9TYQ", "name": "Architectury" },
        { "modId": "g96Z4WVZ", "name": "BadOptimizations" },
        { "modId": "m5T5xmUy", "name": "BetterGrassify" },
        { "modId": "M08ruV16", "name": "Bobby" },
        { "modId": "UIexcMP1", "name": "Borderless Fullscreen" },
        { "modId": "9s6osm5g", "name": "Cloth Config" },
        { "modId": "65UyswbY", "name": 'commandkeys' },
        { "modId": "uZAcFHLd", "name": "Custom FOV" },
        { "modId": "QwxR6Gcd", "name": "Debugify" },
        { "modId": "LQ3K71Q1", "name": "Dynamic FPS" },
        { "modId": "q7vRRpxU", "name": "Emoji Type" },
        { "modId": "OVuFYfre", "name": "Enhanced Block Entities" },
        { "modId": "BVzZfTc1", "name": "Entity Texture Features" },
        { "modId": "NNAgCjsB", "name": "Entity Culling" },
        { "modId": "ihnBJ6on", "name": "Entity View Distance" },
        { "modId": "DynYZEae", "name": "Exordium" },
        { "modId": "P7dR8mSH", "name": "Fabric API" },
        { "modId": "Ha28R6CL", "name": "Fabric Language Kotlin" },
        { "modId": "x1hIzbuY", "name": "FastQuit" },
        { "modId": "uXXizFIs", "name": "FerriteCore" },
        { "modId": "4das1Fjq", "name": "Flashback" },
        { "modId": "blWBX5n1", "name": "forcecloseloadingscreen" },
        { "modId": "ohNO6lps", "name": "Forge Config API Port" },
        { "modId": "hYykXjDp", "name": "Fzzy Config" },
        { "modId": "5ZwdcRci", "name": "ImmediatelyFast" },
        { "modId": "fQEb0iXm", "name": "Krypton" },
        { "modId": "2ecVyZ49", "name": "Ksyxis" },
        { "modId": "uLbm7CG6", "name": "Language Reload" },
        { "modId": "gvQqBUqZ", "name": "Lithium" },
        { "modId": "mOgUt4GM", "name": "Mod Menu" },
        { "modId": "8qkXwOnk", "name": "More Chat History" },
        { "modId": "KuNKN7d2", "name": "Noisium" },
        { "modId": "bWkJ7ejc", "name": "NoRefreshScroll" },
        { "modId": "6xKUDQcB", "name": "No Resource Pack Warnings" },
        { "modId": "MPCX6s5C", "name": "Not Enough Animations" },
        { "modId": "yM94ont6", "name": "Not Enough Crashes" },
        { "modId": "aXf2OSFU", "name": "Ok Zoomer" },
        { "modId": "ccKDOlHs", "name": "owo-lib" },
        { "modId": "RSeLon5O", "name": "Particle Core" },
        { "modId": "Bh37bMuy", "name": "Reeses Sodium Options" },
        { "modId": "M1953qlQ", "name": "Resourceful Config" },
        { "modId": "ZP7xHXtw", "name": "Rrls" },
        { "modId": "Ps1zyz6x", "name": "ScalableLux" },
        { "modId": "iqK5uv72", "name": "Server Pinger Fixer" },
        { "modId": "2M01OLQq", "name": "Shulker Box Tooltip" },
        { "modId": "nKcekY2P", "name": "Smoke Suppression" },
        { "modId": "trr0scVt", "name": "Smooth Scrolling Refurbished" },
        { "modId": "uvlgIwBD", "name": "Smooth Skies" },
        { "modId": "PtjYWJkn", "name": "Sodium Extra" },
        { "modId": "AANobbMI", "name": "Sodium" },
        { "modId": "T9FDHbY5", "name": "Status Effect Timer" },
        { "modId": "vSEH1ERy", "name": "ThreadTweak" },
        { "modId": "1itdse3V", "name": "Time Changer" },
        { "modId": "1cfO6J6t", "name": "totemtweaks" },
        { "modId": "NpPKJQg6", "name": "Vectorientation" },
        { "modId": "rIC2XJV4", "name": "ViaFabricPlus" },
        { "modId": "1eAoo2KR", "name": "Yet Another Config Lib" }
    ],
        '1.21.4': [
        { "modId": "lhGA9TYQ", "name": "Architectury" },
        { "modId": "g96Z4WVZ", "name": "BadOptimizations" },
        { "modId": "m5T5xmUy", "name": "BetterGrassify" },
        { "modId": "M08ruV16", "name": "Bobby" },
        { "modId": "UIexcMP1", "name": "Borderless Fullscreen" },
        { "modId": "485Cv9lY", "name": "Clear Water" },
        { "modId": "9s6osm5g", "name": "Cloth Config" },
        { "modId": "65UyswbY", "name": 'commandkeys' },
        { "modId": "uZAcFHLd", "name": "Custom FOV" },
        { "modId": "QwxR6Gcd", "name": "Debugify" },
        { "modId": "LQ3K71Q1", "name": "Dynamic FPS" },
        { "modId": "q7vRRpxU", "name": "Emoji Type" },
        { "modId": "OVuFYfre", "name": "Enhanced Block Entities" },
        { "modId": "BVzZfTc1", "name": "Entity Texture Features" },
        { "modId": "NNAgCjsB", "name": "Entity Culling" },
        { "modId": "ihnBJ6on", "name": "Entity View Distance" },
        { "modId": "DynYZEae", "name": "Exordium" },
        { "modId": "P7dR8mSH", "name": "Fabric API" },
        { "modId": "Ha28R6CL", "name": "Fabric Language Kotlin" },
        { "modId": "x1hIzbuY", "name": "FastQuit" },
        { "modId": "uXXizFIs", "name": "FerriteCore" },
        { "modId": "4das1Fjq", "name": "Flashback" },
        { "modId": "blWBX5n1", "name": "forcecloseloadingscreen" },
        { "modId": "ohNO6lps", "name": "Forge Config API Port" },
        { "modId": "hYykXjDp", "name": "Fzzy Config" },
        { "modId": "5ZwdcRci", "name": "ImmediatelyFast" },
        { "modId": "fQEb0iXm", "name": "Krypton" },
        { "modId": "2ecVyZ49", "name": "Ksyxis" },
        { "modId": "uLbm7CG6", "name": "Language Reload" },
        { "modId": "gvQqBUqZ", "name": "Lithium" },
        { "modId": "mOgUt4GM", "name": "Mod Menu" },
        { "modId": "8qkXwOnk", "name": "More Chat History" },
        { "modId": "KuNKN7d2", "name": "Noisium" },
        { "modId": "bWkJ7ejc", "name": "NoRefreshScroll" },
        { "modId": "6xKUDQcB", "name": "No Resource Pack Warnings" },
        { "modId": "MPCX6s5C", "name": "Not Enough Animations" },
        { "modId": "yM94ont6", "name": "Not Enough Crashes" },
        { "modId": "YBz7DOs8", "name": "nuit fabric" },
        { "modId": "HpdHOPOp", "name": "nuit interop fabric" },
        { "modId": "ccKDOlHs", "name": "owo-lib" },
        { "modId": "RSeLon5O", "name": "Particle Core" },
        { "modId": "Bh37bMuy", "name": "Reeses Sodium Options" },
        { "modId": "M1953qlQ", "name": "Resourceful Config" },
        { "modId": "ZP7xHXtw", "name": "rrls" },
        { "modId": "Ps1zyz6x", "name": "ScalableLux" },
        { "modId": "iqK5uv72", "name": "Server Pinger Fixer" },
        { "modId": "2M01OLQq", "name": "Shulker Box Tooltip" },
        { "modId": "nKcekY2P", "name": "Smoke Suppression" },
        { "modId": "trr0scVt", "name": "Smooth Scrolling Refurbished" },
        { "modId": "uvlgIwBD", "name": "Smooth Skies" },
        { "modId": "PtjYWJkn", "name": "Sodium Extra" },
        { "modId": "AANobbMI", "name": "Sodium" },
        { "modId": "T9FDHbY5", "name": "Status Effect Timer" },
        { "modId": "vSEH1ERy", "name": "ThreadTweak" },
        { "modId": "1cfO6J6t", "name": "totemtweaks" },
        { "modId": "NpPKJQg6", "name": "Vectorientation" },
        { "modId": "5HUqEye3", "name": "VanillaIcecreamFix" },
        { "modId": "rIC2XJV4", "name": "ViaFabricPlus" },
        { "modId": "1eAoo2KR", "name": "Yet Another Config Lib" }
    ],
    '1.21.5': [
        { "modId": "lhGA9TYQ", "name": "Architectury" },
        { "modId": "uvlgIwBD", "name": "Smooth Skies" },
        { "modId": "g96Z4WVZ", "name": "BadOptimizations" },
        { "modId": "m5T5xmUy", "name": "BetterGrassify" },
        { "modId": "M08ruV16", "name": "Bobby" },
        { "modId": "UIexcMP1", "name": "Borderless Fullscreen" },
        { "modId": "485Cv9lY", "name": "Clear Water" },
        { "modId": "9s6osm5g", "name": "Cloth Config" },
        { "modId": "65UyswbY", "name": "commandkeys" },
        { "modId": "uZAcFHLd", "name": "Custom FOV" },
        { "modId": "QwxR6Gcd", "name": "Debugify" },
        { "modId": "LQ3K71Q1", "name": "Dynamic FPS" },
        { "modId": "BVzZfTc1", "name": "Entity Texture Features" },
        { "modId": "NNAgCjsB", "name": "Entity Culling" },
        { "modId": "ihnBJ6on", "name": "Entity View Distance" },
        { "modId": "P7dR8mSH", "name": "Fabric API" },
        { "modId": "Ha28R6CL", "name": "Fabric Language Kotlin" },
        { "modId": "x1hIzbuY", "name": "FastQuit" },
        { "modId": "uXXizFIs", "name": "FerriteCore" },
        { "modId": "4das1Fjq", "name": "Flashback" },
        { "modId": "blWBX5n1", "name": "forcecloseloadingscreen" },
        { "modId": "ohNO6lps", "name": "Forge Config API Port" },
        { "modId": "hYykXjDp", "name": "Fzzy Config" },
        { "modId": "5ZwdcRci", "name": "ImmediatelyFast" },
        { "modId": "fQEb0iXm", "name": "Krypton" },
        { "modId": "2ecVyZ49", "name": "Ksyxis" },
        { "modId": "uLbm7CG6", "name": "Language Reload" },
        { "modId": "gvQqBUqZ", "name": "Lithium" },
        { "modId": "mOgUt4GM", "name": "Mod Menu" },
        { "modId": "8qkXwOnk", "name": "More Chat History" },
        { "modId": "KuNKN7d2", "name": "Noisium" },
        { "modId": "6xKUDQcB", "name": "No Resource Pack Warnings" },
        { "modId": "MPCX6s5C", "name": "Not Enough Animations" },
        { "modId": "aXf2OSFU", "name": "Ok Zoomer" },
        { "modId": "ccKDOlHs", "name": "owo-lib" },
        { "modId": "RSeLon5O", "name": "Particle Core" },
        { "modId": "Bh37bMuy", "name": "Reeses Sodium Options" },
        { "modId": "M1953qlQ", "name": "Resourceful Config" },
        { "modId": "ZP7xHXtw", "name": "rrls" },
        { "modId": "Ps1zyz6x", "name": "ScalableLux" },
        { "modId": "iqK5uv72", "name": "Server Pinger Fixer" },
        { "modId": "2M01OLQq", "name": "Shulker Box Tooltip" },
        { "modId": "nKcekY2P", "name": "Smoke Suppression" },
        { "modId": "trr0scVt", "name": "Smooth Scrolling Refurbished" },
        { "modId": "PtjYWJkn", "name": "Sodium Extra" },
        { "modId": "AANobbMI", "name": "Sodium" },
        { "modId": "T9FDHbY5", "name": "Status Effect Timer" },
        { "modId": "1cfO6J6t", "name": "totemtweaks" },
        { "modId": "NpPKJQg6", "name": "Vectorientation" },
        { "modId": "rIC2XJV4", "name": "ViaFabricPlus" },
        { "modId": "1eAoo2KR", "name": "Yet Another Config Lib" }
    ],
    '1.21.6': [
        { "modId": "lhGA9TYQ", "name": "Architectury" },
        { "modId": "g96Z4WVZ", "name": "BadOptimizations" },
        { "modId": "m5T5xmUy", "name": "BetterGrassify" },
        { "modId": "UIexcMP1", "name": "Borderless Fullscreen" },
        { "modId": "9s6osm5g", "name": "Cloth Config" },
        { "modId": "65UyswbY", "name": "commandkeys" },
        { "modId": "LQ3K71Q1", "name": "Dynamic FPS" },
        { "modId": "q7vRRpxU", "name": "Emoji Type" },
        { "modId": "BVzZfTc1", "name": "Entity Texture Features" },
        { "modId": "NNAgCjsB", "name": "Entity Culling" },
        { "modId": "ihnBJ6on", "name": "Entity View Distance" },
        { "modId": "P7dR8mSH", "name": "Fabric API" },
        { "modId": "Ha28R6CL", "name": "Fabric Language Kotlin" },
        { "modId": "x1hIzbuY", "name": "FastQuit" },
        { "modId": "uXXizFIs", "name": "FerriteCore" },
        { "modId": "ohNO6lps", "name": "Forge Config API Port" },
        { "modId": "5ZwdcRci", "name": "ImmediatelyFast" },
        { "modId": "fQEb0iXm", "name": "Krypton" },
        { "modId": "2ecVyZ49", "name": "Ksyxis" },
        { "modId": "uLbm7CG6", "name": "Language Reload" },
        { "modId": "gvQqBUqZ", "name": "Lithium" },
        { "modId": "mOgUt4GM", "name": "Mod Menu" },
        { "modId": "8qkXwOnk", "name": "More Chat History" },
        { "modId": "bWkJ7ejc", "name": "NoRefreshScroll" },
        { "modId": "6xKUDQcB", "name": "No Resource Pack Warnings" },
        { "modId": "yM94ont6", "name": "Not Enough Crashes" },
        { "modId": "aXf2OSFU", "name": "Ok Zoomer" },
        { "modId": "Bh37bMuy", "name": "Reeses Sodium Options" },
        { "modId": "M1953qlQ", "name": "Resourceful Config" },
        { "modId": "ZP7xHXtw", "name": "rrls" },
        { "modId": "Ps1zyz6x", "name": "ScalableLux" },
        { "modId": "iqK5uv72", "name": "Server Pinger Fixer" },
        { "modId": "2M01OLQq", "name": "Shulker Box Tooltip" },
        { "modId": "nKcekY2P", "name": "Smoke Suppression" },
        { "modId": "AANobbMI", "name": "Sodium" },
        { "modId": "vSEH1ERy", "name": "ThreadTweak" },
        { "modId": "rIC2XJV4", "name": "ViaFabricPlus" },
        { "modId": "1eAoo2KR", "name": "Yet Another Config Lib" }
    ],
    '1.21.7': [
        { "modId": "lhGA9TYQ", "name": "Architectury" },
        { "modId": "g96Z4WVZ", "name": "BadOptimizations" },
        { "modId": "m5T5xmUy", "name": "BetterGrassify" },
        { "modId": "M08ruV16", "name": "Bobby" },
        { "modId": "UIexcMP1", "name": "Borderless Fullscreen" },
        { "modId": "9s6osm5g", "name": "Cloth Config" },
        { "modId": "65UyswbY", "name": "commandkeys" },
        { "modId": "QwxR6Gcd", "name": "Debugify" },
        { "modId": "LQ3K71Q1", "name": "Dynamic FPS" },
        { "modId": "BVzZfTc1", "name": "Entity Texture Features" },
        { "modId": "ihnBJ6on", "name": "Entity View Distance" },
        { "modId": "P7dR8mSH", "name": "Fabric API" },
        { "modId": "Ha28R6CL", "name": "Fabric Language Kotlin" },
        { "modId": "5ZwdcRci", "name": "ImmediatelyFast" },
        { "modId": "2ecVyZ49", "name": "Ksyxis" },
        { "modId": "uLbm7CG6", "name": "Language Reload" },
        { "modId": "mOgUt4GM", "name": "Mod Menu" },
        { "modId": "8qkXwOnk", "name": "More Chat History" },
        { "modId": "aXf2OSFU", "name": "Ok Zoomer" },
        { "modId": "Bh37bMuy", "name": "Reeses Sodium Options" },
        { "modId": "Ps1zyz6x", "name": "ScalableLux" },
        { "modId": "iqK5uv72", "name": "Server Pinger Fixer" },
        { "modId": "2M01OLQq", "name": "Shulker Box Tooltip" },
        { "modId": "trr0scVt", "name": "Smooth Scrolling Refurbished" },
        { "modId": "uvlgIwBD", "name": "Smooth Skies" },
        { "modId": "PtjYWJkn", "name": "Sodium Extra" },
        { "modId": "AANobbMI", "name": "Sodium" },
        { "modId": "1eAoo2KR", "name": "Yet Another Config Lib" }
    ]
};

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        console.log(`Making request to: ${url}`);

        const options = {
            headers: {
                'User-Agent': 'Ogulniega-Launcher/1.0.0 (contact@example.com)'
            },
            timeout: 10000
        };

        const request = https.get(url, options, (response) => {
            console.log(`Response status: ${response.statusCode} for ${url}`);

            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                console.log(`Redirecting to: ${response.headers.location}`);
                return makeRequest(response.headers.location).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            }

            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log(`Successfully parsed JSON response from ${url}`);
                    resolve(jsonData);
                } catch (error) {
                    console.error(`Failed to parse JSON from ${url}: ${error.message}`);
                    console.error(`Response data: ${data.substring(0, 500)}...`);
                    reject(new Error(`Failed to parse JSON: ${error.message}`));
                }
            });

            response.on('error', (error) => {
                console.error(`Response error for ${url}: ${error.message}`);
                reject(error);
            });
        });

        request.on('error', (error) => {
            console.error(`Request error for ${url}: ${error.message}`);
            reject(error);
        });

        request.on('timeout', () => {
            console.error(`Request timeout for ${url}`);
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function getProject(modId) {
    const url = `${MODRINTH_API_BASE}/project/${modId}`;
    return await makeRequest(url);
}

async function getProjectVersions(modId, minecraftVersion) {
    const url = `${MODRINTH_API_BASE}/project/${modId}/version?game_versions=["${minecraftVersion}"]&loaders=["fabric"]`;
    return await makeRequest(url);
}

async function getProjectVersionsWithFallback(modId, minecraftVersion, onLog) {

    try {
        onLog(`Trying exact version: ${minecraftVersion}`);
        const versions = await getProjectVersions(modId, minecraftVersion);
        if (versions.length > 0) {
            onLog(`Found ${versions.length} versions for ${minecraftVersion}`);
            return { versions, usedVersion: minecraftVersion };
        }
    } catch (error) {
        onLog(`Error fetching versions for ${minecraftVersion}: ${error.message}`);
    }

    const fallbackVersions = getCompatibleVersions(minecraftVersion);
    onLog(`No versions found for ${minecraftVersion}, trying fallback versions: ${fallbackVersions.join(', ')}`);

    for (const fallbackVersion of fallbackVersions) {
        try {
            onLog(`Trying fallback version: ${fallbackVersion}`);
            const versions = await getProjectVersions(modId, fallbackVersion);
            if (versions.length > 0) {
                onLog(`Found ${versions.length} versions for fallback ${fallbackVersion}`);
                return { versions, usedVersion: fallbackVersion };
            }
        } catch (error) {
            onLog(`Error fetching versions for fallback ${fallbackVersion}: ${error.message}`);
        }
    }

    onLog(`No compatible versions found for any fallback versions`);
    return { versions: [], usedVersion: null };
}

function getCompatibleVersions(targetVersion) {

    const versionCompatibility = {
        '1.19.2': ['1.19.1', '1.19'],
        '1.19.1': ['1.19'],
        '1.20.1': ['1.20'],
        '1.20.2': ['1.20.1', '1.20'],
        '1.20.3': ['1.20.2', '1.20.1', '1.20'],
        '1.20.4': ['1.20.3', '1.20.2', '1.20.1', '1.20'],
        '1.20.5': ['1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20'],
        '1.20.6': ['1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20'],
        '1.21.1': ['1.21'],
        '1.21.2': ['1.21.1', '1.21'],
        '1.21.3': ['1.21.2', '1.21.1', '1.21'],
        '1.21.4': ['1.21.3', '1.21.2', '1.21.1', '1.21'],
        '1.21.5': ['1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21'],
        '1.21.6': ['1.21.5', '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21'],
        '1.21.7': ['1.21.6', '1.21.5', '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21']
    };

    return versionCompatibility[targetVersion] || [];
}

function downloadFile(url, filePath, onProgress) {
    return new Promise((resolve, reject) => {

        const dir = path.dirname(filePath);
        fs.ensureDir(dir).then(() => {
            const file = fs.createWriteStream(filePath);

            file.on('error', (error) => {
                console.error(`File stream error: ${error.message}`);
                fs.unlink(filePath, () => {});
                reject(error);
            });

            const options = {
                headers: {
                    'User-Agent': 'Ogulniega-Launcher/1.0.0 (contact@example.com)'
                },

                timeout: 30000
            };

            const request = https.get(url, options, (response) => {

                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    file.close();
                    fs.unlink(filePath, () => {});
                    return downloadFile(response.headers.location, filePath, onProgress)
                        .then(resolve)
                        .catch(reject);
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(filePath, () => {});
                    return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }

                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    if (onProgress && totalSize) {
                        const progress = Math.round((downloadedSize / totalSize) * 100);
                        onProgress(progress, downloadedSize, totalSize);
                    }
                });

                response.on('error', (error) => {
                    console.error(`Response error: ${error.message}`);
                    file.close();
                    fs.unlink(filePath, () => {});
                    reject(error);
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close((err) => {
                        if (err) {
                            console.error(`File close error: ${err.message}`);
                            fs.unlink(filePath, () => {});
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            request.on('error', (error) => {
                console.error(`Request error: ${error.message}`);
                file.close();
                fs.unlink(filePath, () => {});
                reject(error);
            });

            request.on('timeout', () => {
                console.error('Request timeout');
                request.destroy();
                file.close();
                fs.unlink(filePath, () => {});
                reject(new Error('Request timeout'));
            });
        }).catch(reject);
    });
}

async function isModAlreadyInstalled(modConfig, versionModsDir) {
    try {
        if (!await fs.pathExists(versionModsDir)) {
            return false;
        }

        const files = await fs.readdir(versionModsDir);
        const jarFiles = files.filter(file => file.endsWith('.jar'));

        if (jarFiles.length === 0) {
            return false;
        }

        const modName = modConfig.name.toLowerCase();
        const modId = modConfig.modId.toLowerCase();

        const nameVariants = getModNameVariants(modConfig);

        return jarFiles.some(file => {
            const fileName = file.toLowerCase();

            if (modConfig.modId === 'AANobbMI') {
                return nameVariants.some(variant => {
                    const variantLower = variant.toLowerCase();

                    return (fileName.startsWith(variantLower + '-') ||
                           fileName === variantLower + '.jar') &&
                           !fileName.includes('extra') &&
                           !fileName.includes('options') &&
                           !fileName.includes('reeses');
                });
            }

            return nameVariants.some(variant =>
                fileName.includes(variant.toLowerCase())
            );
        });
    } catch (error) {
        console.error(`Error checking if mod is installed: ${error.message}`);
        return false;
    }
}

function getModNameVariants(modConfig) {
    const variants = [modConfig.name];

    switch (modConfig.modId) {
        case 'P7dR8mSH':
            variants.push('fabric-api', 'fabricapi');
            break;
        case 'AANobbMI':
            variants.push('sodium-fabric');
            break;
        case 'gvQqBUqZ':
            variants.push('lithium');
            break;
        case 'rAfhHfow':
            variants.push('phosphor');
            break;
        case 'YL57xq9U':
            variants.push('iris', 'iris-shaders');
            break;
        case 'mOgUt4GM':
            variants.push('modmenu', 'mod-menu');
            break;
        case 'nfn13YXA':
            variants.push('rei', 'roughlyenoughitems');
            break;
        case 'Orvt0mRa':
            variants.push('indium');
            break;
    }

    variants.forEach(variant => {
        if (variant.includes(' ')) {
            variants.push(variant.replace(/ /g, '-'));
            variants.push(variant.replace(/ /g, '_'));
            variants.push(variant.replace(/ /g, ''));
        }
    });

    return [...new Set(variants)];
}

async function downloadMod(modConfig, minecraftVersion, versionModsDir, onLog, onProgress) {
    try {
        onLog(`Checking ${modConfig.name} (ID: ${modConfig.modId})...`);

        if (await isModAlreadyInstalled(modConfig, versionModsDir)) {
            onLog(`${modConfig.name} already installed, skipping.`);
            return { success: true, skipped: true };
        }

        onLog(`Fetching project info for ${modConfig.name}...`);

        const project = await getProject(modConfig.modId);
        onLog(`Project info retrieved: ${project.title || modConfig.name}`);

        onLog(`Fetching versions for MC ${minecraftVersion}...`);

        const { versions, usedVersion } = await getProjectVersionsWithFallback(modConfig.modId, minecraftVersion, onLog);

        if (versions.length === 0) {
            onLog(`No compatible version found for ${modConfig.name} (MC ${minecraftVersion} or fallback versions)`);
            return { success: false, reason: 'No compatible version' };
        }

        const latestVersion = versions[0];
        if (usedVersion !== minecraftVersion) {
            onLog(`Selected version: ${latestVersion.version_number} (${latestVersion.name || 'unnamed'}) - using fallback MC ${usedVersion}`);
        } else {
            onLog(`Selected version: ${latestVersion.version_number} (${latestVersion.name || 'unnamed'})`);
        }

        const file = latestVersion.files.find(f => f.primary) || latestVersion.files[0];

        if (!file) {
            onLog(`No download file found for ${modConfig.name}`);
            onLog(`Available files: ${latestVersion.files.length}`);
            return { success: false, reason: 'No download file' };
        }

        onLog(`Download file: ${file.filename} (${Math.round(file.size / 1024 / 1024 * 100) / 100}MB)`);
        onLog(`Download URL: ${file.url}`);

        const fileName = file.filename;

        const filePath = path.resolve(path.join(versionModsDir, fileName));

        onLog(`Downloading ${modConfig.name} v${latestVersion.version_number} (${fileName})...`);
        onLog(`Target path: ${filePath}`);

        try {
            await fs.ensureDir(versionModsDir);

            const testFile = path.join(versionModsDir, '.write_test');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
        } catch (permError) {
            onLog(`Directory permission error: ${permError.message}`);
            return { success: false, reason: `Directory not writable: ${permError.message}` };
        }

        await downloadFile(file.url, filePath, (progress, downloaded, total) => {
            if (onProgress) {
                onProgress(modConfig.name, progress, downloaded, total);
            }
        });

        onLog(`Downloaded ${modConfig.name} v${latestVersion.version_number}`);
        return { success: true, fileName, version: latestVersion.version_number };

    } catch (error) {
        onLog(`Failed to download ${modConfig.name}: ${error.message}`);
        return { success: false, reason: error.message };
    }
}

async function scanInstalledMods(versionModsDir, modConfigs, onLog) {
    try {
        if (!await fs.pathExists(versionModsDir)) {
            onLog(`Mods directory doesn't exist yet: ${versionModsDir}`);
            return { installedMods: [], missingMods: modConfigs };
        }

        const files = await fs.readdir(versionModsDir);
        const jarFiles = files.filter(file => file.endsWith('.jar'));

        onLog(`Found ${jarFiles.length} JAR files in mods directory`);
        if (jarFiles.length > 0) {
            onLog(`Existing files: ${jarFiles.join(', ')}`);
        }

        const installedMods = [];
        const missingMods = [];

        for (const modConfig of modConfigs) {
            if (await isModAlreadyInstalled(modConfig, versionModsDir)) {
                installedMods.push(modConfig);
                onLog(`Found: ${modConfig.name}`);
            } else {
                missingMods.push(modConfig);
                onLog(`Missing: ${modConfig.name}`);
            }
        }

        return { installedMods, missingMods };
    } catch (error) {
        onLog(`Error scanning mods: ${error.message}`);
        return { installedMods: [], missingMods: modConfigs };
    }
}

async function downloadModsForVersion(minecraftVersion, versionModsDir, onLog, onProgress) {
    onLog(`System info: Platform=${process.platform}, Arch=${process.arch}`);
    onLog(`Target directory: ${versionModsDir}`);

    const modConfigs = MOD_CONFIGS[minecraftVersion];

    if (!modConfigs || modConfigs.length === 0) {
        onLog(`No mods configured for Minecraft ${minecraftVersion}`);
        return { success: true, downloaded: 0, skipped: 0, failed: 0 };
    }

    onLog(`\nScanning mods for Minecraft ${minecraftVersion}...`);
    onLog(`Required mods: ${modConfigs.map(m => m.name).join(', ')}`);

    try {
        await fs.ensureDir(versionModsDir);
        onLog(`Directory created/verified: ${versionModsDir}`);

        const testFile = path.join(versionModsDir, '.permission_test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        onLog(`Directory is writable`);
    } catch (dirError) {
        onLog(`Directory setup failed: ${dirError.message}`);
        return { success: false, downloaded: 0, skipped: 0, failed: 0, error: dirError.message };
    }

    const { installedMods, missingMods } = await scanInstalledMods(versionModsDir, modConfigs, onLog);

    if (installedMods.length > 0) {
        onLog(`\nAlready installed (${installedMods.length}): ${installedMods.map(m => m.name).join(', ')}`);
    }

    if (missingMods.length === 0) {
        onLog(`\nAll mods are already installed! No downloads needed.`);
        return { success: true, downloaded: 0, skipped: installedMods.length, failed: 0 };
    }

    onLog(`\nNeed to download (${missingMods.length}): ${missingMods.map(m => m.name).join(', ')}`);
    onLog(`Starting downloads...`);

    const modsToDownload = missingMods;

    let downloaded = 0;
    let skipped = installedMods.length;
    let failed = 0;

    for (let i = 0; i < modsToDownload.length; i++) {
        const modConfig = modsToDownload[i];

        if (onProgress) {
            onProgress(`Downloading mods (${i + 1}/${modsToDownload.length})`, i + 1, modsToDownload.length);
        }

        const result = await downloadMod(
            modConfig,
            minecraftVersion,
            versionModsDir,
            onLog,
            (modName, progress, downloadedBytes, totalBytes) => {
                onLog(`  ${modName}: ${progress}% (${Math.round(downloadedBytes / 1024 / 1024 * 100) / 100}MB / ${Math.round(totalBytes / 1024 / 1024 * 100) / 100}MB)`);
            }
        );

        if (result.success) {
            if (result.skipped) {

                skipped++;
            } else {
                downloaded++;
            }
        } else {
            failed++;
        }
    }

    onLog(`\nMod installation summary for MC ${minecraftVersion}:`);
    onLog(`  Downloaded: ${downloaded}`);
    onLog(`  Skipped: ${skipped}`);
    onLog(`  Failed: ${failed}`);

    return { success: true, downloaded, skipped, failed };
}

function getModsForVersion(minecraftVersion) {
    return MOD_CONFIGS[minecraftVersion] || [];
}

module.exports = {
    downloadModsForVersion,
    getModsForVersion,
    downloadMod,
    getProject,
    getProjectVersions,
    getProjectVersionsWithFallback,
    getCompatibleVersions,
    scanInstalledMods,
    isModAlreadyInstalled
};