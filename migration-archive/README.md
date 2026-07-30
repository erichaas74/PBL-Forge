# Migration archive

`physics-coupled-dragon-genetics` is the pre-separation implementation of the genetics lab. It remains as a historical reference.

Production no longer imports from this archive. The extracted simulation core lives at `src/app/features/dragon-genetics/simulation`, while the reusable garage, arena, creation library, and assembly engine live under `src/app/shared`.

The separate `dragon-genetics-lab` folder is also a legacy standalone project. Neither archive folder is compiled into PBL Forge.
