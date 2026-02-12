# TileMap

A tilemap (literally a “tile map” or “grid map”) is a grid used to create a game’s layout / graphical background. There are several advantages to using the TileMap node to design your levels. It makes it possible to draw the layout by “painting” tiles onto the grid, which is much faster than placing each tile individually as Sprite nodes one by one.

# Tileset

A tileset is a set of tiles that lets you create a map (mapping).

1) Choose the tile size. Here, we have 32×32 px.

![tileset](./spec-tileset.png)

2) The image width and height don’t matter, but best practice is to keep the width smaller (for example, showing 8 tiles per row) and the height larger (for example, 100 tiles). This makes the tileset easier to handle in map editors.  
3) The image must not exceed 4096×4096 px.  
4) The tile size must evenly divide the image size. For example, if the tile width is 32 px, the tileset shouldn’t be 250 px wide but 256 px (8 tiles of 32 px).  
5) It’s possible to use multiple tilesets on a map. If you think you’ll use most of the tiles, still prefer one large tileset rather than several separate tilesets.

> It’s not mandatory for it to be a square, but it’s recommended (simpler for mapping).

Then, this tile is used to be drawn onto the map.

![tileset2](./spec-tileset2.png)

# Autotiles

Autotiles let you define a group of tiles, then add rules to control which tile is used when drawing, depending on what’s in neighboring cells.

## Edge autotile

An autotile is a small tileset that displays tiles according to specific rules. Here, it’s about generating the edges of a tile.

The edges are defined like this:

![autotile](./spec-autotile.png)

# A Spritesheet

A sprite is a graphical element in the game. It represents a player, a non-player character, a chest, etc. Often, that sprite has movement or action animations. To make animations, we use a spritesheet (a set of sprites).

![spritesheet](./spritesheet.png)

1) Generally, the sprite’s width is the same as the tile width, and the height is the tile height (or tile height × 1.5).  
2) Each row of the spritesheet represents an action, for example, the walking/movement animation.  
3) If you have multiple other characters, use the same logic (the same animation rows).  
4) Important: the width and height of a sprite must be identical to the other sprites in the animation.

![spritesheet-bad](./spritesheet-bad.png)

![spritesheet-ok](./spritesheet-ok.png)

5) If you have actions other than movement, put them in the same image. Example:

![spritesheet-actions](./animation-chara.png)