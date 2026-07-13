-- Add newly completed, reviewed player memory content from the campaign vault.
-- Publication makes these records available to the DM; players still require
-- a separate active reveal before RLS exposes either memory.

begin;

insert into public.memories (
  id,
  character_id,
  slug,
  position,
  chapter_label,
  title,
  excerpt,
  markdown_body,
  publication_status,
  artwork_alt
)
values
  (
    '31000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000001',
    'beyond-my-reach',
    5,
    $chapter$Fragment V$chapter$,
    $title$Beyond My Reach$title$,
    $excerpt$The first spear struck my shield hard enough to drive its rim into my breastplate.$excerpt$,
    $memory$The first spear struck my shield hard enough to drive its rim into my breastplate. Pain ran through my shoulder, and my rear boot slid across the wet stone before catching in a crack at the mouth of the causeway. "Keep them off the bridge!" I shouted as four Silver Flame knights spread out around me. Longswords turned spears aside, armoured shoulders drove attackers back, and silver fire flashed along a raised blade. Disciplined infantry kept coming, their grey armour filling the western street as fresh ranks stepped over the fallen through rain and ash.

The causeway crossed a swollen river to an eastern gatehouse. Its portcullis stood raised while families, carts, wounded soldiers, and frightened horses crowded through the arch. Soldiers beneath the gate waved each group onward, and every heartbeat we held the western end gave another person time to reach shelter. Then a horn sounded from the far side of the square. Six Silver Flame knights were trapped against a fountain after falling masonry sealed the street behind them, and one raised his sword when our eyes met. "Aelarion!" he shouted. "Open a path!"

I stepped toward him, and the four knights around me turned at once. Before we could advance, a cart wheel broke on the causeway behind us. The cart lurched sideways and blocked the road to the gatehouse while civilians pressed around it and two soldiers strained beneath the axle. A young boy fell beside the cart, and his mother covered him as a thrown spear struck the stone near her back. I returned to the mouth of the bridge and raised my shield. "Hold here," I ordered.

The next attacker drove his spear over my shield. I caught the shaft against my sword, twisted it free, and struck him with the shield's edge. A mace hit my pauldron, and the knight beside me cut its wielder down while I recovered. Behind us, the soldiers dragged the broken cart aside. The boy and his mother reached the gatehouse, followed by more families bent beneath bundles or supporting wounded relatives.

Across the square, the trapped knights called again as their torn banner dipped behind the grey-armoured soldiers surrounding the fountain. "We can reach them," the knight beside me said. I watched the final wagon struggle toward the eastern arch, its driver whipping the panicked horses while three soldiers pushed from behind. "Hold," I said. Another spearhead punched through my shield and numbed two fingers around the grip. I cut it away and kept fighting while the battle at the fountain narrowed to fragments: a silver gauntlet gripping the basin, a sword flashing above the crowd, and the torn banner sinking into the rain.

Three horn notes sounded from the eastern gatehouse as the final wagon passed beneath the portcullis. Archers on the battlements sent a volley into the causeway, forcing the infantry to raise their shields. "Back to the gate," I ordered. "Go." The knights withdrew one at a time under the archers' cover, and I followed the last silver cloak as armoured footsteps pounded behind me. The portcullis dropped as I passed beneath the arch, striking the ground between us and the pursuing soldiers. Defenders drove heavy braces into place while weapons rattled against the bars.

Beyond the gatehouse, families continued along the eastern road. The boy from the bridge clung to his mother, wounded soldiers leaned against the carts, and hundreds of survivors moved away from the river. I looked back through the portcullis. Across the causeway, six silver cloaks lay around the fountain.

I lowered myself onto one knee and rested the shield across it. Dents covered its face, and the broken spearhead remained lodged near the rim. I spread my hand over the battered metal. It was broad enough to cover one body. The rain continued as the gatehouse, the river, and the shield faded into darkness.$memory$,
    'published',
    null
  ),
  (
    '34000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000004',
    'what-the-forest-remembers',
    5,
    $chapter$Fragment V$chapter$,
    $title$What the Forest Remembers$title$,
    $excerpt$The grove quieted my footsteps as I approached the Pool of Remembrance.$excerpt$,
    $memory$The grove quieted my footsteps as I approached the Pool of Remembrance. Silver moss sank beneath my boots, and the cool air smelled of pine needles and rain. Around the water, the Veilborne rose in a wide circle, their silver bark marked by deep folds and their gold-veined leaves glowing in the twilight.

One thick root curved from the nearest Veilborne toward the pool. I knelt beside it, rested my palm against the warm bark, and closed my eyes. My breathing slowed as a steady pulse moved from the root into my hand. The silver moss beneath my knees became wet earth beneath bare feet, and I ran through summer rain with a child's sharp laughter in my throat. My hands grew broad and scarred around a hunting bow, then cradled an infant against my breast. I tasted frostberries, smelled autumn smoke, braided a lover's hair, and descended from the canopy on old, aching knees. Songs from centuries before my birth joined in my throat until my own life became one bright thread among thousands.

The memories slowed, and I stood at the edge of the grove. Age had curved my back and swollen the joints of my hands. Silver hair lay in a braid over my shoulder, and each breath moved gently through a body that had carried me for centuries.

Several generations of my family waited where the dark forest floor gave way to silver moss. They embraced me one at a time, touching their foreheads to mine and sharing quiet memories that made us laugh. Then they gathered close and began the low song that had accompanied every Joining I could remember.

The elf nearest me took my hands and smiled.

"Are you ready?" they asked.

I had walked this path beside others and watched each continue into the grove when their time came. Now the Veilborne stirred overhead, and their leaves took up the melody rising behind me.

"I am ready," I said.

They pressed their brow to mine for one final breath. I turned toward the Veilborne and followed the silver moss alone, carrying my family's song into the grove.

The ache eased from my knees as I walked. At a hollow of dark soil, I lowered myself to the earth and rested my open hands beside me. Silver trunks filled the twilight, and the song moved softly through their leaves.

The first roots curled over my feet with the softness of young vines. More rose from the soil and wound around my legs and wrists. Their warmth spread through my joints as they drew my body into the earth, and silver moved slowly across my skin.

My heartbeat slowed, each beat separated by a longer and easier breath. The roots carried familiar laughter and the warmth of hands once held at the grove's edge. When my chest rose for the final time, I smelled rain in the leaves above me.

My breath left my body and moved through the canopy.

The grove opened around me. Roots crossed beneath the soil and carried memory from tree to tree: births, storms, songs, old paths, healing herbs, and generations of hands tending the same living forest. The farewell song I had carried into the hollow flowed into those roots, joining the greater chorus beneath the grove.

Years moved through us. Children sheltered beneath silver branches. Lost Wardens touched warm bark and found paths home in the memories we carried. Healers reached into our roots for remedies learned centuries earlier.

The many roots beneath the grove narrowed to a single pulse against my hand. Silver moss pressed beneath my knees again, and my next breath filled my own chest. I opened my eyes beside the Pool of Remembrance with my palm still resting on the Veilborne's warm root.

The lives within the grove had passed beyond names, yet every choice, kindness, grief, and lesson remained in their shared roots. Gold travelled through the canopy as the Veilborne's pulse settled into the rhythm of my heart. I leaned forward, pressed my forehead against the bark, and stayed there until the grove receded into shadow and the memory ended.$memory$,
    'published',
    null
  )
on conflict (character_id, position) do update
set slug = excluded.slug,
    chapter_label = excluded.chapter_label,
    title = excluded.title,
    excerpt = excluded.excerpt,
    markdown_body = excluded.markdown_body,
    publication_status = excluded.publication_status,
    artwork_alt = excluded.artwork_alt;

commit;
