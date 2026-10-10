/**
 * semantic-v2 · RECOGNISED FOOD, second volume (PHASE-2B-PLAN §6.1): more general food vocabulary by word class, used
 * by `recognisedFoodHead` in ./foods together with the classes there. Head nouns go in the food classes; words that only
 * describe a food (cuts, styles, textures, sizes, origins) go in MORE_MODIFIERS so they can stand before a head but
 * never be one. Lower case, without diacritics, mostly singular (regular plurals are derived). Hyphenated entries are
 * recognised as written ("pie-crust"); their parts are not added as words of their own.
 *
 * Written from the word classes of English cookery and grocery vocabulary and of the world cuisines it borrows from —
 * not from test inputs.
 */

/** Fruits, including tropical and regional ones and named cultivars used as nouns. */
export const FRUITS_MORE =
  "ackee akee babaco bilberry blackcurrant redcurrant whitecurrant dewberry jostaberry saskatoon serviceberry thimbleberry wineberry " +
  "chokeberry chokecherry acerola calamansi calamondin limequat minneola ugli oroblanco shaddock dekopon sumo sudachi kabosu etrog " +
  "pitahaya cupuacu camu jabuticaba lucuma mamey mamoncillo guanabana atemoya pawpaw langsat salak santol amla jamun chikoo sapodilla " +
  "naseberry noni nopal nopales nopalitos tuna-fruit fuyu hachiya kaki medjool deglet barhi calimyrna kadota plumcot apriums pluots " +
  "grapefruits pomelos kiwis mandarins tangelos satsumas clementines berries fruitcake craisin craisins applesauce lemonade-fruit " +
  "honeycrisp macintosh mcintosh braeburn jonagold gala fuji pippin bramley cox russet-apple bartlett bosc anjou comice seckel " +
  "freestone clingstone donut-peach flat-peach white-peach cherimoya feijoas tamarillo tamarillos naranjilla lulo granadilla maracuya " +
  "parcha guava guayaba carambola durian rambutans lychees longans mangosteens jackfruits breadfruits plantains bananas mangoes mangos";

/** Vegetables, sprouts, greens, roots, gourds and edible flowers. */
export const VEGETABLES_MORE =
  "broccoflower celtuce chayote christophene choko mirliton gailan gai-lan kai-lan bittermelon karela gourd gourds lauki opo luffa loofah " +
  "tinda tindora moringa yardlong long-bean longbean lupini lupin scorzonera skirret oca yacon arracacha crosne crosnes chufa tigernut " +
  "kangkong puntarelle castelfranco treviso tardivo chioggia cavolo nero orach chickweed purslane sea-beans glasswort " +
  "fingerling fingerlings creamer creamers tater taters spud spuds new-potato aloo gobi palak saag matar mattar arbi mooli bhindi " +
  "baingan brinjal brinjals ladies-fingers ladyfinger-okra peapod peapods snowpeas mangetout mangetouts pea-shoots tendril tendrils " +
  "microgreens sprouts shoots alfalfa clover radish-sprouts beansprout beansprouts cress pepper-cress landcress " +
  "rapini broccolette broccolino caulini cauliflowerets brussel brussels collardgreens greens mustard-greens turnip-greens beet-greens " +
  "haricot haricots vert verts frenchbean frenchbeans runner runners wax-beans flat-beans romano-beans pole-beans bush-beans " +
  "corncob corncobs cornichons gherkins midget-gherkins pickling-cucumbers cuke cukes pepperoncinis peppadews cherry-peppers " +
  "chilli chillies chilies chiles chili-peppers capsicums sweetpepper sweetpeppers bell-peppers peperoncini peperoncino pepperoncino " +
  "cubanelles poblanos jalapenos serranos habaneros anaheims fresnos shishitos padrons hatch-chiles birdseye birds-eye " +
  "aubergines eggplants zucchinis courgettes marrows squashes pumpkins gourds calabacita calabacitas tromboncino " +
  "onions shallots scallions spring-onions green-onions leeks ramps chives garlic-scapes scapes scape green-garlic elephant-garlic " +
  "beetroots beets turnips swedes rutabagas parsnips carrots radishes daikons jicamas kohlrabies celeriacs salsifies sunchokes " +
  "artichoke-hearts heart-of-palm palm hearts-of-palm palmito bamboo-shoots water-chestnuts lotus-root burdock gobo " +
  "blossom blossoms flower flowers petal petals nasturtium nasturtiums marigold pansy pansies violet violets elderflower elderflowers " +
  "squash-blossoms zucchini-flowers hibiscus jamaica butterfly-pea rose-petals chamomile-flowers lavender-buds";

/** Mushrooms and fungi. */
export const MUSHROOMS_MORE =
  "mushrooms champignon champignons chanterelles girolle girolles morels porcinis ceps maitakes hen-of-the-woods lion's mane " +
  "lionsmane chicken-of-the-woods king-trumpet kingtrumpet trumpets beech-mushrooms shimejis enokis enokitake shiitakes portobellos " +
  "portabellas creminis criminis buttons oysters-mushrooms black-trumpets matsutakes huitlacoche cuitlacoche truffle truffles woodear " +
  "cloud-ear tree-ear wood-ear snow-fungus nameko pioppino blewit blewits puffball puffballs mousseron mousserons";

/** Herbs, leaves and aromatics. */
export const HERBS_MORE =
  "angelica burnet catnip chamomile cicely costmary hoja santa lemon-balm balm verbena lemon-verbena mugwort papalo pipicha rau-ram " +
  "sawtooth ngo-gai woodruff tulsi holy-basil lemon-basil licorice-root mint-leaves basil-leaves curry-leaves kari-leaves bay-leaves " +
  "lime-leaves makrut-lime kaffir-lime pandan-leaves banana-leaves fig-leaves shiso-leaves perilla-leaves sesame-leaves hoja-santa " +
  "cilantro-leaves coriander-leaves parsley-leaves dill-fronds fronds frond sprigs stems tops greens";

/** Spices, seasoning blends and salts. */
export const SPICES_MORE =
  "achiote annatto amchoor amchur anardana kala-namak cubeb cubebs pippali mahleb mahlab mastic wattleseed zedoary kokum loomi " +
  "black-lime dried-lime kencur fingerroot krachai tonka melegueta timut tellicherry kampot mignonette piment piri-piri peri-peri " +
  "peri peri chermoula advieh panch phoron sambar rasam goda kitchen-king tandoori tikka madras pickapeppa montreal lawry's lawrys " +
  "tajin chamoy recado everything-bagel lemon-pepper poultry-seasoning italian-seasoning herbes provence quatre-epices mulling " +
  "pickling-spice crab-boil zatarain's zatarains shrimp-boil gomasio nanami shichimi-togarashi sel gris fleur flake-salt maldon " +
  "msg accent sazón goya adobo-seasoning complete sason seasoning-salt garlic-salt onion-salt celery-salt smoked-salt truffle-salt " +
  "chili-powder chile-powder chilli-powder cayenne-pepper red-pepper black-pepper white-pepper green-peppercorns pink-peppercorns " +
  "allspice-berries juniper-berries coriander-seed cumin-seed fennel-seed mustard-seeds caraway-seeds celery-seed dill-seed " +
  "nutmegs vanilla-beans vanilla-pods cinnamon-sticks cassia-bark quills quill pods pod berries seeds threads strands";

/** Condiments, sauces, pickles, spreads, oils, vinegars and sweeteners. */
export const CONDIMENTS_MORE =
  "ajvar amba atchara bagoong banana-ketchup bulldog chili-crisp chili-oil chilli-oil lao-gan-ma cocktail-sauce doenjang ssamjang " +
  "chogochujang hoisin nam-pla nuoc-mam nuoc-cham tsuyu mentsuyu tare tonkatsu okonomi yum-yum eel-sauce unagi-sauce kabayaki " +
  "worcestershire hp brown-sauce salad-cream branston chowchow chow-chow mostarda nam-prik nam-jim prik oelek kecap ketjap valentina " +
  "tapatio cholula frank's franks crystal louisiana texas-pete zhug zhoug schug skhug toum skordalia taramasalata tarama pistou mojo " +
  "pipian recado queso nacho cajeta dulce-de-leche lemon-curd lime-curd conserve conserves confiture compote coulis jam jams jellies " +
  "golden-syrup treacle cane-syrup date-syrup silan pekmez carob-molasses birch-syrup rice-syrup brown-rice-syrup malt-syrup " +
  "barley-malt glucose-syrup invert-sugar orgeat falernum grenadine rose-syrup rooh-afza dijon grainy wholegrain-mustard karashi " +
  "canola rapeseed safflower groundnut grapeseed ricebran rice-bran palm-oil shortening crisco margarine oleo spread spreads " +
  "duck-fat goose-fat bacon-fat bacon-grease grease suet dripping drippings tallow lard schmaltz ghee " +
  "vinegars balsamico cider-vinegar malt-vinegar rice-vinegar sherry-vinegar wine-vinegar coconut-vinegar cane-vinegar black-vinegar " +
  "chinkiang verjuice verjus agrodolce mayonnaises aiolis remoulades relishes chutneys pickle pickles achar achaar " +
  "salsas pestos hummuses dressings vinaigrettes marinades glazes gravies dips spreads bastes baste rub rubs brine brines " +
  "sweet-chili sweet-chilli thai-chili sambal-oelek kewpie hellmann's hellmanns duke's dukes miracle-whip heinz tabasco huy-fong " +
  "kikkoman maggi knorr bovril marmite vegemite better-than-bouillon bouillons sazon-goya old-bay accent-seasoning mrs-dash";

/** Meat, poultry, game, charcuterie and cuts used as head nouns. */
export const MEATS_MORE =
  "porterhouse t-bones tomahawk tomahawks picanha coulotte denver bavette onglet flat-iron flatirons tri-tip tritip culotte " +
  "oxtails tongues cheeks sweetbreads tripes marrowbones marrow-bones shins osso buco ossobuco veal-shanks mutton hogget " +
  "boar venison elk bison buffalo moose caribou antelope pheasants partridges grouse squabs pigeons guinea-hens poussins capons " +
  "hens roosters cornish-hens game-hens gamehens gizzards giblets livers chicken-livers hearts feet chicken-feet paws drumettes " +
  " wingettes wingtips tenderloins oysters spatchcock schnitzels escalopes scallopini paillards roulades roast roasts joint " +
  "joints gammon hams prosciuttos jamon jamón iberico culatello lardo bresaola salame salamis soppressata finocchiona nduja " +
  "chorizos longaniza longganisa linguica chourico morcilla butifarra sobrasada salchichon knackwursts weisswursts bockwurst " +
  "frankfurters wieners franks kielbasas kabanos boudins tasso merguez loukaniko sujuk sucuk lap-cheong lup-cheong sai-ua chipolatas " +
  "banger bangers cumberland lincolnshire black-pudding white-pudding haggis scrapple souse head-cheese headcheese pates terrines " +
  "rillettes foie-gras confits pastrami corned-beef salt-beef biltong jerky charqui cecina carne seca lardons back-bacon streaky " +
  "peameal porchetta carnitas barbacoa birria chicharron chicharrones crackling cracklings cracklins pork-rinds spare-ribs " +
  "spareribs riblets baby-backs babybacks flanken galbi kalbi bulgogi char-siu siu-yuk lechon tocino tapa longsilog adobo " +
  "pulled-pork brisket briskets burnt-ends rib-tips sirloin-tips kebabs kabobs skewers-meat souvlakia satays " +
  "medallions noisettes noisette cutlets chops steaks fillets filets loins shanks shoulders legs thighs breasts wings " +
  "drumsticks quarters halves carcasses necks bones hocks trotters knuckles jowls bellies " +
  "liverwurst braunschweiger bologna mortadella pepperoni capicola capocollo coppa speck pancetta guanciale salt-pork fatback " +
  "hot-dogs hotdogs corndogs brats bratwursts italian-sausage chicken-sausage turkey-sausage breakfast-sausage sausage-links " +
  "luncheon lunchmeat deli-meat coldcuts spam vienna-sausages viennas meatball meatballs kofta koftas kofte keftedes frikadeller " +
  "rissole rissoles croquetas croquettes patties burgers hamburgers cheeseburgers smashburgers sliders mince ground-beef " +
  "steak-tips stew-meat stewing-beef beef-cubes fajita-meat stir-fry-beef shabu-shabu sukiyaki yakiniku katsu tonkatsu " +
  "pinwheel pinwheels chashu chasu rabbits hares quails ducks ducklings geese turkeys chickens hens squab duckbreast magret";

/** Fish, shellfish and seafood products. */
export const SEAFOOD_MORE =
  "arctic-char barramundi bluefish bonito branzino brill butterfish caviar roe ikura tobiko masago uni sea-urchin cockles conch " +
  "crawdad crawdads crayfish cuttlefish dogfish dory john-dory eel eels escargot escargots snail snails flounder fluke geoduck " +
  "gurnard hake hoki kingfish langostino langostinos langoustines lingcod mahimahi mahi-mahi dorado marlin monkfish mullet mullets " +
  "opah orange-roughy perch pickerel plaice pomfret pompano porgy porgies rockfish sablefish black-cod scad scrod shad shark skate " +
  "smelt snapper snappers sprat sprats sturgeon surimi swordfish tilefish turbot wahoo walleye whitebait whitefish whiting yellowtail " +
  "hamachi kanpachi mentaiko tarako bottarga lutefisk gravlax lox kipper kippers bloater bloaters finnan haddie bacalao bacalhau " +
  "baccala stockfish katsuobushi bonito-flakes dashi fumet fish-stock seafood-stock clam-juice clam-broth crab-sticks crabsticks " +
  "kamaboko chikuwa fishcakes fish-cakes fishballs fish-balls fishsticks fish-sticks fish-fingers shrimps prawns tiger-prawns " +
  "king-prawns spot-prawns rock-shrimp bay-shrimp salad-shrimp popcorn-shrimp shell-on scampi crab-legs crab-claws crabmeat " +
  "lobster-tails lobster-meat lobstermeat langouste crawfish-tails tailmeat tail-meat scallops sea-scallops bay-scallops " +
  "diver-scallops mussels clams littlenecks cherrystones quahogs razor-clams oysters bluepoints kumamotos " +
  "squid squids calamari calamaris octopi octopuses tuna-steaks salmon-fillets salmon-steaks salmon-portions fish-fillets " +
  "anchovy-fillets anchovies sardines pilchards mackerels herrings trout trouts char chars tilapias cods haddocks pollocks " +
  "halibuts flounders soles catfishes basses breams groupers snappers mahis swordfishes sturgeons";

/** Dairy, cheese, eggs and their alternatives. */
export const DAIRY_MORE =
  "ayran lassi skyr quark fromage-blanc fromage-frais creme-fraiche kaymak labne labneh chhena khoa khoya mawa curds cheese-curds " +
  "burrata stracciatella bocconcini ovoline ciliegine perline provolone scamorza caciocavallo fontina taleggio dolcelatte asiago " +
  "montasio piave grana parmigiano parmigiano-reggiano grana-padano pecorino-romano fiore sardo manchego mahon idiazabal roncal " +
  "cabrales valdeon tetilla garrotxa queso quesillo cotija oaxaca chihuahua asadero panela requeson feta halloumi haloumi kefalotyri " +
  "kasseri graviera mizithra myzithra manouri akkawi nabulsi jibneh gouda edam leerdammer maasdam limburger emmental emmentaler " +
  "gruyere comte beaufort raclette appenzeller tilsit tilsiter vacherin reblochon tomme morbier brie camembert coulommiers chaource " +
  "epoisses munster muenster livarot roquefort bleu saint-agur cambozola stilton wensleydale cheshire lancashire caerphilly " +
  "cheddar cheddars colby monterey pepper-jack muenster havarti jarlsberg gjetost brunost samso danbo fontal boursin chevre " +
  "crottin bucheron valencay humboldt velveeta american cheese-slices singles string-cheese cheesestick cheesesticks " +
  "cream-cheese neufchatel ricotta-salata smoked-gouda mozz mozzarella-balls pearls cheese-blend cheeses cheddar-cheese " +
  "parmesan-cheese parm reggianito romano-cheese queso-blanco queso-fresco queso-anejo queso-cotija oaxaca-cheese " +
  "milks creams creamers half-n-half halfnhalf coffee-creamer whipping-cream heavy-cream double-cream single-cream sourcream " +
  "yogurts yoghurts greek-yogurt kefirs buttermilks butters ghees margarines eggs egg-whites egg-yolks yolks whites " +
  "duck-eggs quail-eggs goose-eggs liquid-eggs egg-substitute   aquafaba";

/** Breads, doughs, pastry and baked goods. */
export const BAKED_MORE =
  "bialy bialys bolillo bolillos telera teleras concha conchas pandesal pan-de-sal ensaymada mantou baozi shaobing youtiao " +
  "scallion-pancake roti-canai crumpets teacake teacakes bannock bannocks soda-bread farl farls oatcake oatcakes pumpernickel " +
  "boule boules batard fougasse pain croissants pain-au-chocolat kouign-amann kouign-amanns crullers beignets churros donuts " +
  "doughnuts fritters bear-claw bearclaw cinnamon-roll cinnamon-rolls sticky-buns kolache kolaches kolachky babka babkas " +
  "stollen panettone pandoro colomba kulich paska hot-cross-buns sally-lunn chelsea-bun lardy-cake eccles madeleine madeleines " +
  "financier financiers canele caneles macaron macarons biscotti cantucci amaretti amaretto-cookies savoiardi shortbreads " +
  "speculoos stroopwafel stroopwafels pizzelle pizzelles krumkake rosettes florentine florentines tuile tuiles crispbread " +
  "crispbreads knackebrod rusk rusks zwieback melba crostini bruschette grissini breadsticks pretzel-rolls pretzel-buns " +
  "bagel-chips pita-chips naan-chips croutons breadcrumbs panko johnnycakes hushpuppy hushpuppies spoonbread popover popovers " +
  "yorkshire puddings dutch-baby crepes crêpes blini blinis blintz blintzes flapjack flapjacks hotcake hotcakes " +
  "pikelet pikelets tortes tartlets galettes crostatas pasties empanadas empanaditas samosas turnovers strudels baklavas " +
  "kunafa kunefe knafeh kataifi choux eclairs profiteroles cream-puffs gougere gougeres cannolis sfogliatella sfogliatelle " +
  "zeppole bomboloni sufganiyot paczki malasada malasadas loukoumades gulab-jamun jalebi jalebis ladoo laddoo laddu barfi burfi " +
  "pithivier vol-au-vent vol-au-vents bouchees palmier palmiers sacristain allumettes mille-feuille napoleon napoleons " +
  "brioche brioches buns rolls dinner-rolls kaiser-rolls hoagie-rolls sub-rolls hero-rolls slider-buns hamburger-buns hotdog-buns " +
  "hot-dog-buns potato-rolls hawaiian-rolls parker-house knots garlic-knots breadsticks biscuits drop-biscuits scones " +
  "english-muffins crumpets muffins cupcakes minimuffins mini-muffins loaf loaves sandwich-bread toast-bread texas-toast " +
  "flatbread flatbreads pitas pittas naans rotis chapatis chapattis parathas puris pooris bhatura bhaturas kulcha kulchas dosa " +
  "dosas idli idlis appam appams uttapam injera lavash markook khubz barbari sangak taftoon pide simit simits matzos matzahs " +
  "tortillas tortilla-chips arepas pupusas gorditas sopes tlayudas tostadas taco-shells tostada-shells piecrust pie-crust " +
  "pie-shell pie-shells tart-shell tart-shells pastry-shell vol-au-vent-cases puff-pastry shortcrust pate-brisee pate-sucree " +
  "pizza-dough pizza-crust pizza-base pizza-bases flatbread-crust crusts doughs batter batters starter levain poolish biga " +
  "graham-crackers grahams wafers vanilla-wafers nilla-wafers ladyfingers gingersnaps snaps animal-crackers saltines " +
  "saltine oyster-crackers water-crackers table-water club-crackers wheat-thins triscuit triscuits ritz cheez-its goldfish " +
  "crackers crisps oatmeal-cookies sugar-cookies chocolate-chip-cookies snickerdoodles shortbread-cookies sandwich-cookies " +
  "oreos chips-ahoy nutter-butters fig-newtons fig-bars biscoff lotus-biscuits digestives digestive hobnobs rich-tea " +
  "brownies blondies bars lemon-bars cookie-dough brownie-mix cake-mix muffin-mix pancake-mix biscuit-mix bisquick " +
  "jiffy cornbread-mix crescent-dough crescent-rolls biscuit-dough pie-dough phyllo-dough filo-dough puff-pastry-sheets";

/** Prepared dishes from many cuisines (head nouns of dish names). */
export const DISHES_MORE =
  "aloo-gobi chana masala chole rajma dal-makhani makhani tadka sambar rasam upma poha khichdi khichri pulao pulav biriyani " +
  "dum korma kurma saagwala palak-paneer tikka-masala butter-chicken jalfrezi rogan josh nihari haleem keema kheema kofta " +
  "pakora pakoras bhaji bhajis bhajia vada vadas dhokla chaat bhel pani-puri golgappa kachori kachoris raita kheer halwa " +
  "pho bun-bo banh-xeo goi-cuon cha-gio com-tam bo-luc-lac larb laab som-tam tom-yum tom-kha khao-pad pad-see-ew pad-kra-pao " +
  "massaman panang kaeng gaeng khao-soi rendang gado-gado satay sate soto mie-goreng nasi-lemak nasi-goreng char-kway-teow " +
  "laksa roti-prata murtabak hainanese lumpia lumpias pancit sinigang kare-kare sisig lechon tinola afritada caldereta menudo " +
  "bibimbap japchae galbi-jjim jjigae jjim jeon pajeon kimbap gimbap tteok tteokbokki mandu bossam samgyetang naengmyeon " +
  "sukiyaki shabu oden nabe donburi donburis katsudon oyakodon gyudon tendon karaage kushikatsu yakitori tsukune gyoza onigiri " +
  "omurice okonomiyaki takoyaki ramen tsukemen yakisoba yaki-udon chawanmushi tamagoyaki miso-soup chirashi temaki uramaki " +
  "maki nigiri sashimi sushi-rolls handrolls hand-rolls dim-sum siu-mai shumai siomai har-gow har-gao xiaolongbao soup-dumplings " +
  "baozi char-siu-bao wontons potstickers jiaozi zongzi congee jook mapo kung-pao gongbao chow-mein lo-mein chop-suey " +
  "egg-foo-young fried-rice dan-dan biang-biang hot-pot hotpot twice-cooked sweet-and-sour-pork orange-chicken general-tso's " +
  "tamales tamale pozole posole menudo birria barbacoa carnitas cochinita pibil mole moles chilaquiles enchiladas enfrijoladas " +
  "entomatadas quesadillas quesabirria gorditas sopes huaraches tlayudas tacos taquitos flautas burritos chimichangas nachos " +
  "elote esquites tortas torta cemitas pambazos tostadas ceviches aguachile cocteles caldo caldos sopa sopas arroz frijoles " +
  "refritos charro borracho calabacitas rajas picadillo tinga salpicon fideo fideos albondigas chiles-rellenos rellenos relleno " +
  "feijoada moqueca coxinha coxinhas pao-de-queijo farofa vatapa acaraje empadas salteñas saltenas anticuchos lomo-saltado " +
  "causa papas-a-la-huancaina aji-de-gallina arepa cachapa cachapas pabellon hallaca hallacas mofongo tostones maduros " +
  "pastelillos pasteles alcapurrias bacalaitos sancocho ropa-vieja vaca-frita lechon-asado picadillo medianoche cubano cubanos " +
  "jerk-chicken curry-goat oxtail-stew ackee-and-saltfish rice-and-peas bammy patties beef-patties roti-wrap " +
  "jollof suya egusi fufu banku kenkey injera wat doro-wat tibs kitfo shiro bobotie bunny-chow biltong boerewors chakalaka " +
  "tagine tajine couscous harira bastilla pastilla shakshuka shakshouka menemen borek boreks burek lahmacun pide manti " +
  "kebab kebabs doner adana iskender kofte kofta koftas meze mezze mezes dolma dolmas dolmades sarma sarmale yaprak " +
  "imam-bayildi karniyarik kibbeh kibbe kubbeh fattoush tabbouleh tabouleh mujadara mujaddara maqluba mansaf musakhan " +
  "shawarma shawarmas falafel falafels sabich foul ful medames hummus msabbaha baba-ghanoush moutabal muhammara " +
  "spanakopita tiropita moussaka pastitsio gemista souvlaki gyro gyros horiatiki stifado kleftiko avgolemono fasolada " +
  "borscht borsch pelmeni vareniki varenyky pierogi pierogis blini syrniki golubtsi holubtsi stroganoff kotlety solyanka " +
  "goulash gulyas paprikash lecso langos schnitzel sauerbraten rouladen spaetzle knodel knoedel kloesse bratkartoffeln " +
  "kartoffelsalat currywurst maultaschen flammkuchen tarte-flambee choucroute cassoulet bouillabaisse ratatouille pot-au-feu " +
  "blanquette bourguignon daube navarin tartiflette aligot gratin dauphinoise brandade quiche croque-monsieur croque-madame " +
  "galette galettes crepe socca pissaladiere salade-nicoise nicoise vichyssoise soupe veloute risotto risotti paella paellas " +
  "fideua tortilla-espanola gazpacho salmorejo pisto patatas bravas croquetas albondigas pulpo gambas pimientos fabada " +
  "cocido caldo-verde bacalhau feijoada francesinha arancini supplì suppli lasagna lasagne cannelloni manicotti ziti " +
  "carbonara cacio amatriciana gricia puttanesca bolognese ragu ragù minestrone ribollita pappa-al-pomodoro panzanella " +
  "caprese vitello tonnato saltimbocca piccata marsala parmigiana parmesan-style milanese ossobuco osso-buco polpette " +
  "frittata frittatas carpaccio bruschetta crostini antipasto antipasti calzone calzones stromboli panini piadina piadine " +
  "focaccia pizza pizzas flatbreads shepherd's-pie cottage-pie toad-in-the-hole bangers-and-mash bubble-and-squeak " +
  "fish-and-chips ploughman's scotch-egg scotch-eggs sausage-rolls pasties pork-pies kedgeree cullen-skink stovies haggis " +
  "colcannon boxty welsh-rarebit rarebit cawl laverbread gumbo jambalaya etouffee po'boy po-boy muffuletta " +
  "red-beans grillades boudin-balls hoppin-john succotash brunswick-stew burgoo chili-con-carne cincinnati-chili sloppy " +
  "sloppy-joes joes meatloaf pot-roast pot-pie chicken-and-dumplings biscuits-and-gravy chicken-fried-steak fried-chicken " +
  "mac-and-cheese macaroni-and-cheese mac-n-cheese casserole hotdish tater-tot-hotdish green-bean-casserole stuffing dressing " +
  "deviled-eggs devilled-eggs potato-salad egg-salad tuna-salad chicken-salad pasta-salad coleslaw slaw ambrosia waldorf " +
  "cobb caesar chef's wedge sandwiches subs hoagies heroes wraps paninis melts reubens clubs blts sliders " +
  "burgers cheesesteak cheesesteaks philly lobster-rolls crab-cakes clam-chowder chowders bisques stews soups broths " +
  "salads kabobs pinchos brochettes satays yakitoris rolls wraps dumplings noodles";

/** Sweets, desserts, candy, snacks and branded snack foods named by their brand alone. */
export const SWEETS_MORE =
  "brigadeiro brigadeiros alfajor alfajores polvoron polvorones turron turrones mazapan cajeta-candy obleas pan-dulce " +
  "mochi mochis daifuku dango yokan dorayaki taiyaki imagawayaki melonpan castella anmitsu warabimochi kakigori bingsu " +
  "hotteok yakgwa tangyuan mooncake mooncakes egg-tarts eggtarts nian-gao sesame-balls jian-dui halo-halo leche-flan ube " +
  "bibingka puto kutsinta suman turon kulfi rasgulla rasmalai sandesh peda mysore-pak gajar-halwa shrikhand basundi " +
  "kunafa basbousa namoura maamoul ma'amoul halva halvah lokum turkish-delight loukoumi galaktoboureko loukoumades " +
  "tiramisu panna-cotta pannacotta zabaglione semifreddo affogato granita gelati sorbetto cassata zuppa-inglese " +
  "crema-catalana churros-con-chocolate flan flans tres-leches arroz-con-leche natillas leche-frita torrijas " +
  "creme-brulee pots-de-creme clafoutis tarte-tatin profiteroles mousse mousses souffles ile-flottante dacquoise " +
  "sachertorte linzer linzertorte black-forest kuchen streuselkuchen bienenstich apfelstrudel kaiserschmarrn " +
  "pavlova lamingtons anzac tim-tams trifle trifles eton-mess sticky-toffee banoffee bakewell treacle-tart spotted-dick " +
  "crumble crumbles cobbler cobblers crisps buckles slumps grunts pandowdies brown-betty bread-pudding rice-pudding " +
  "banana-pudding puddings custards jellies jello jell-o gelatin gelatins parfaits sundaes sundae floats float " +
  "ice-cream icecream ice-creams gelato gelatos sorbet sorbets sherbet sherbets popsicles ice-pops icepops freezer-pops " +
  "fudgsicles creamsicles drumsticks ice-cream-sandwiches cones waffle-cones sugar-cones cake-cones " +
  "candy candies sweets lollies bonbons pralines truffles caramels toffees brittles nougats marshmallows fluff " +
  "marshmallow-fluff marshmallow-creme gumdrops gumdrop jujubes jujyfruits licorice twizzlers red-vines skittles starburst " +
  "snickers twix butterfinger heath milky-way three-musketeers 3-musketeers baby-ruth payday almond-joy mounds york " +
  "peppermint-patties andes rolo rolos whoppers maltesers malted-milk-balls milk-duds junior-mints raisinets goobers " +
  "m&m's m&ms m&m reese's reeses reese's-pieces kit-kats kitkat kitkats kisses hershey hersheys hershey's toblerone " +
  "ferrero rocher lindor lindt ghirardelli godiva cadbury aero crunchie flake bounty galaxy dairy-milk wispa " +
  "smarties sweetarts nerds airheads laffy-taffy taffy saltwater-taffy jolly-ranchers lifesavers life-savers altoids tic-tacs " +
  "mentos warheads sour-patch gummies gummy-worms gummy-bears haribo swedish-fish peeps candy-corn cotton-candy " +
  "chocolate-chips chocolate-chunks chocolate-morsels butterscotch-chips peanut-butter-chips white-chips carob-chips " +
  "toffee-bits heath-bits sprinkles jimmies nonpareils sanding-sugar sugar-pearls dragees edible-glitter luster-dust " +
  "candy-melts melting-wafers almond-bark candy-coating chocolate-coating couverture callets pistoles feves " +
  "chips potato-chips crisps kettle-chips tortilla-chips corn-chips pita-chips bagel-chips veggie-chips plantain-chips " +
  "doritos fritos cheetos tostitos pringles ruffles lays lay's funyuns bugles sun-chips sunchips takis " +
  "popcorn kettle-corn caramel-corn cracker-jack crackerjacks pretzels pretzel-sticks pretzel-rods pretzel-twists " +
  "rice-cakes rice-crackers senbei puffs cheese-puffs pork-rinds chicharrones trail-mix nuts-and-bolts chex-mix " +
  "granola-bars protein-bars energy-bars cereal-bars fruit-snacks fruit-leather fruit-roll-ups gushers " +
  // packaged snack and drink brands named alone ("4 Lunchables", "1 bottle Snapple", "6 Toaster Strudels")
  "lunchable lunchables uncrustables pop-tarts poptarts eggo eggos twinkie twinkies hostess snapple yoo-hoo nesquik capri-sun " +
  "kool-aid jello-shots strudels toaster-strudels bagel-bites pizza-rolls totino's hot-pockets";

/** Drinks: wines, beers, spirits, liqueurs, soft drinks, coffees and teas. */
export const DRINKS_MORE =
  "chardonnay sauvignon pinot merlot cabernet shiraz syrah zinfandel riesling gewurztraminer moscato muscat muscadet " +
  "viognier chenin semillon albarino verdejo gruner vinho verde tempranillo garnacha grenache mourvedre carignan " +
  "nebbiolo barolo barbaresco barbera dolcetto sangiovese montepulciano primitivo nero lambrusco valpolicella amarone " +
  "chianti brunello rioja ribera priorat malbec carmenere tannat pinotage cava cremant champagne prosecco franciacorta " +
  "asti sekt spumante vin-santo vinsanto sauternes tokaji icewine ice-wine port porto tawny ruby madeira marsala sherry " +
  "fino manzanilla amontillado oloroso pedro-ximenez px vermouth vermouths dubonnet lillet cocchi punt-e-mes " +
  "sake sakes soju shochu makgeolli baijiu mijiu shaoxing huangjiu umeshu plum-wine " +
  "beer beers lager lagers ale ales stout stouts porter porters pilsner pilsners ipa ipas hefeweizen weissbier wheat-beer " +
  "kolsch bock doppelbock marzen saison lambic gueuze kriek framboise shandy radler cider ciders perry mead meads " +
  "guinness corona heineken budweiser modelo pacifico tecate dos-equis negra-modelo stella peroni sapporo asahi kirin " +
  "tsingtao singha " +
  "spirit spirits liquor liquors liqueur liqueurs vodka vodkas gin gins rum rums whiskey whiskeys whisky whiskies " +
  "bourbon bourbons scotch scotches rye ryes brandy brandies cognac armagnac calvados applejack grappa pisco tequila " +
  "tequilas mezcal mezcals sotol raicilla bacanora cachaca cachaça aguardiente arak arrack raki ouzo tsipouro " +
  "absinthe pastis pernod ricard sambuca anisette amaretto frangelico kahlua baileys cointreau curacao triple-sec " +
  "grand-marnier chartreuse benedictine drambuie galliano campari aperol cynar fernet branca amaro amari averna " +
  "montenegro nonino ramazzotti jagermeister jägermeister becherovka unicum chambord st-germain midori malibu " +
  "schnapps kirsch kirschwasser slivovitz poire eau-de-vie cassis creme-de-cassis creme-de-menthe creme-de-cacao " +
  "creme-de-violette maraschino luxardo limoncello arancello nocino mirto strega advocaat irish-cream " +
  "bitters angostura peychaud's peychauds orange-bitters fee-brothers grenadine orgeat falernum " +
  "bacardi smirnoff absolut tito's titos grey-goose jameson jack-daniel's jim-beam maker's-mark makers-mark wild-turkey " +
  "johnnie-walker glenfiddich tanqueray beefeater bombay hendrick's hendricks captain-morgan kraken goslings " +
  "patron jose-cuervo don-julio espolon casamigos " +
  "soda sodas pop soft-drink soft-drinks cola colas coke cokes pepsi sprite fanta 7-up seven-up dr-pepper mountain-dew " +
  "mtn-dew squirt fresca ginger-ale ginger-beer root-beer birch-beer cream-soda sarsaparilla tonic tonic-water " +
  "club-soda seltzer seltzers sparkling-water mineral-water spring-water la-croix lacroix perrier pellegrino san-pellegrino " +
  "topo-chico gatorade powerade vitaminwater kool-aid koolaid tang crystal-light lemonades limeades orangeade " +
  "juices nectars smoothies shakes milkshakes frappe frappes frappuccino slushies slurpees agua-fresca aguas-frescas " +
  "horchata tepache jamaica tamarindo chicha sikhye sujeonggwa lassi lassis ayran doogh kombuchas kvass kefir-water " +
  "coffee coffees espresso espressos americano lattes cappuccinos mochas macchiatos cortado cortados flat-white " +
  "cold-brew coldbrew nitro instant-coffee coffee-beans coffee-grounds grounds beans " +
  "teas tea-leaves loose-leaf earl-grey darjeeling assam ceylon keemun lapsang souchong oolong sencha gyokuro bancha " +
  "genmaicha hojicha kukicha matcha rooibos honeybush chamomile peppermint-tea mint-tea hibiscus-tea yerba mate " +
  "pu-erh puerh chai masala-chai jasmine-tea green-tea black-tea white-tea herbal-tea iced-tea sweet-tea bubble-tea boba " +
  "tapioca-pearls cocoa hot-chocolate drinking-chocolate ovaltine nesquik milo horlicks eggnog nog toddy toddies " +
  "glogg gluhwein mulled-wine sangria sangrias margarita margaritas mojito mojitos martini martinis daiquiri daiquiris " +
  "negroni negronis spritz spritzes mixer mixers cocktail-mixer sour-mix margarita-mix bloody-mary-mix";

/** Nuts, seeds, grains, flours, legumes, soy foods, noodles and pasta. */
export const NUTS_GRAINS_MORE =
  "almonds marcona walnuts black-walnuts pecans hazelnuts filberts cashews pistachios peanuts goobers macadamias " +
  "brazil-nuts pinenuts pine-nuts pignoli pinon pinons chestnuts marrons tigernuts cobnuts candlenuts candlenut kukui " +
  "pepitas pumpkinseeds sunflower-seeds sesame-seeds benne flaxseeds linseed linseeds chia-seeds hemp-hearts hempseed " +
  "poppyseed poppyseeds melon-seeds watermelon-seeds lotus-seeds basil-seeds sabja nigella-seeds " +
  "grain grains ricecakes jasmine-rice basmati-rice arborio carnaroli vialone bomba calasparra calrose koshihikari " +
  "sushi-rice sticky-rice sweet-rice glutinous-rice black-rice forbidden-rice red-rice wild-rice brown-rice white-rice " +
  "parboiled-rice converted-rice instant-rice minute-rice cauliflower-rice riced-cauliflower " +
  "wheatberries wheat-berries farro spelt emmer einkorn kamut khorasan freekeh frikeh bulgur bulghur burghul cracked-wheat " +
  "couscous pearl-couscous israeli-couscous moghrabieh maftoul fregola barley pearl-barley hulled-barley pot-barley " +
  "oats oatmeal rolled-oats old-fashioned-oats quick-oats steel-cut-oats oat-groats groats oat-bran oatbran " +
  "quinoa amaranth millet sorghum teff fonio buckwheat kasha triticale job's-tears jobs-tears " +
  "cornmeal polenta grits hominy masa masa-harina maseca nixtamal posole-corn cornflour corn-flour cornstarch " +
  "flour flours all-purpose bread-flour cake-flour pastry-flour self-rising whole-wheat-flour graham-flour rye-flour " +
  "spelt-flour almond-flour almond-meal coconut-flour oat-flour rice-flour sweet-rice-flour mochiko tapioca-flour " +
  "tapioca-starch potato-starch potato-flour arrowroot chickpea-flour gram-flour besan buckwheat-flour teff-flour " +
  "semolina durum farina cream-of-wheat atta maida sooji rava suji vital-wheat-gluten wheat-gluten wheat-germ " +
  "bran wheat-bran psyllium psyllium-husk xanthan-gum guar-gum " +
  "beans legumes pulses chickpeas garbanzos garbanzo-beans black-beans turtle-beans kidney-beans red-beans pinto-beans " +
  "navy-beans haricot-beans cannellini-beans white-beans great-northern-beans butter-beans lima-beans fava-beans " +
  "broad-beans borlotti-beans cranberry-beans flageolets adzuki-beans azuki-beans mung-beans moong urad urad-dal " +
  "toor toor-dal tur arhar chana chana-dal masoor masoor-dal moong-dal dal dals dhal lentils puy-lentils green-lentils " +
  "brown-lentils red-lentils yellow-lentils black-lentils beluga-lentils split-peas yellow-split-peas green-split-peas " +
  "black-eyed-peas blackeyed-peas cowpeas pigeon-peas gandules field-peas crowder-peas lupini-beans soybeans soya " +
  "edamame tofu tofus tempeh seitan yuba natto tvp soy-curls bean-curd beancurd tofu-skin fried-tofu tofu-puffs " +
  "pasta pastas noodles noodle spaghetti spaghettini spaghettoni linguine linguini fettuccine fettuccini fettucine " +
  "tagliatelle tagliolini pappardelle bucatini perciatelli capellini angel-hair vermicelli vermicelli-noodles " +
  "penne penne-rigate mostaccioli rigatoni ziti ziti-rigati fusilli rotini rotelle wagon-wheels farfalle farfalline " +
  "bowties bow-ties orecchiette conchiglie conchigliette shells pasta-shells jumbo-shells cavatappi cavatelli gemelli " +
  "radiatori campanelle macaroni elbow-macaroni elbows ditalini ditali tubetti orzo risoni acini-di-pepe stelline " +
  "pastina alphabet alphabets anelli anellini lasagna-noodles lasagne-sheets lasagna-sheets manicotti cannelloni " +
  "ravioli raviolis tortellini tortelloni agnolotti cappelletti mezzelune gnocchi gnudi malloreddus trofie " +
  "strozzapreti casarecce garganelli paccheri calamarata mafalde mafaldine reginette lumache lumaconi pici " +
  "egg-noodles wide-egg-noodles kluski spaetzle spätzle halushki " +
  "ramen ramen-noodles udon udon-noodles soba soba-noodles somen hiyamugi shirataki konjac konnyaku kelp-noodles " +
  "rice-noodles rice-sticks rice-vermicelli bun banh-pho pho-noodles mai-fun chow-fun ho-fun kway-teow sen-yai sen-lek " +
  "glass-noodles cellophane-noodles bean-thread bean-threads sweet-potato-noodles dangmyeon japchae-noodles " +
  "lo-mein-noodles chow-mein-noodles wonton-noodles egg-noodle mee hokkien-noodles yi-mein e-fu misua " +
  "rice-paper rice-papers spring-roll-wrappers wonton-wrappers dumpling-wrappers gyoza-wrappers egg-roll-wrappers " +
  "potsticker-wrappers shumai-wrappers lumpia-wrappers";

/** Pantry staples: baking, canned, jarred and packaged goods, sweeteners and additives. */
export const PANTRY_MORE =
  "yeast instant-yeast active-dry-yeast rapid-rise fresh-yeast cake-yeast baking-powder baking-soda bicarbonate bicarb " +
  "cream-of-tartar gelatin gelatine knox agar agar-agar kanten pectin sure-jell certo citric-acid ascorbic-acid " +
  "malt-powder diastatic-malt milk-powder buttermilk-powder egg-powder meringue-powder custard-powder bird's " +
  "cocoa cocoa-powder cacao-powder cacao-nibs chocolate baking-chocolate unsweetened-chocolate " +
  "couverture chocolate-bar chocolate-bars candy-bar candy-bars " +
  "sugar sugars cane-sugar beet-sugar raw-sugar turbinado demerara muscovado jaggery gur piloncillo panela rapadura " +
  "palm-sugar coconut-sugar date-sugar maple-sugar brown-sugar powdered-sugar icing-sugar confectioners-sugar " +
  "castor-sugar caster-sugar superfine-sugar pearl-sugar sanding-sugar rock-sugar sugar-cubes sugarcubes " +
  "honey honeys honeycomb agave agave-nectar maple-syrup pancake-syrup corn-syrup karo molasses blackstrap sorghum " +
  "stevia truvia splenda sucralose erythritol xylitol allulose monk-fruit monkfruit saccharin aspartame sweet'n-low " +
  "vanilla vanilla-extract vanilla-paste vanilla-bean-paste almond-extract peppermint-extract lemon-extract " +
  "orange-extract coconut-extract maple-extract rum-extract anise-extract food-coloring food-colouring gel-coloring " +
  "canned tinned jarred boxed bagged packaged frozen dried " +
  "bouillon bouillon-cubes stock-cubes stock-pots oxo knorr better-than-bouillon base soup-base broth-base demi-glace " +
  "consomme consommé stocks broths bone-broth dashi-granules hondashi chicken-powder chicken-bouillon beef-bouillon " +
  "soup-mix onion-soup-mix gravy-mix sauce-mix seasoning-mix taco-seasoning fajita-seasoning chili-seasoning " +
  "ranch-mix ranch-seasoning dip-mix dressing-mix stuffing-mix croutons breadcrumbs bread-crumbs cracker-crumbs " +
  "cornflake-crumbs panko-breadcrumbs crumbs coating shake-and-bake fry-mix tempura-batter batter-mix fish-fry " +
  "pudding-mix jello-mix gelatin-mix frosting-mix icing-mix glaze-mix whipped-topping cool-whip reddi-wip dream-whip " +
  "evaporated-milk condensed-milk sweetened-condensed-milk coconut-milk coconut-cream cream-of-coconut coco-lopez " +
  "coconut-water dried-milk powdered-milk nonfat-dry-milk dry-milk carnation " +
  "tomato-paste tomato-puree tomato-sauce crushed-tomatoes diced-tomatoes whole-tomatoes stewed-tomatoes passata " +
  "rotel ro-tel tomatoes-and-chiles salsa-verde enchilada-sauce chipotles-in-adobo green-chiles diced-green-chiles " +
  "refried-beans baked-beans pork-and-beans chili-beans ranch-style-beans cream-of-mushroom cream-of-chicken " +
  "cream-of-celery condensed-soup soups pie-filling cherry-pie-filling apple-pie-filling pumpkin-puree pumpkin-pie-mix " +
  "fruit-cocktail mandarin-oranges pineapple-chunks pineapple-tidbits pineapple-rings crushed-pineapple peach-halves " +
  "pear-halves applesauce apple-sauce cranberry-sauce jellied-cranberry maraschino-cherries cocktail-cherries " +
  "olives capers artichokes roasted-peppers pimientos sun-dried-tomatoes giardiniera pepperoncinis banana-peppers " +
  "hearts-of-palm water-chestnuts bamboo-shoots baby-corn straw-mushrooms bean-sprouts sauerkraut kimchi " +
  "tuna salmon sardines anchovies kippers clams oysters crabmeat chicken-breast spam corned-beef vienna-sausages " +
  "cereal cereals cornflakes corn-flakes frosted-flakes rice-krispies krispies cheerios chex corn-chex rice-chex " +
  "wheat-chex wheaties raisin-bran bran-flakes all-bran grape-nuts special-k shredded-wheat weetabix muesli granola " +
  " kix trix lucky-charms froot-loops fruit-loops cap'n-crunch honey-nut golden-grahams cinnamon-toast-crunch " +
  "cocoa-puffs cocoa-krispies corn-pops apple-jacks puffed-rice puffed-wheat crispix grits cream-of-rice malt-o-meal";

/** Words that describe a food and may stand before its head, never a head themselves. */
export const MORE_MODIFIERS =
  // cuts and parts used before a head ("top round roast", "eye of round", "point-cut brisket", "St. Louis-style ribs")
  "top bottom eye point flat tip heel knuckle sirloin round rump chuck shoulder blade arm picnic butt boston " +
  "center-cut end-cut point-cut flat-cut first-cut second-cut st louis st.-louis louis-style spiral spiral-cut spiral-sliced " +
  "bone semi-boneless semi-boned pin-boned skin-off scaled gutted head-on head-off shell-on shell-off tail-on tail-off " +
  "peeled-and-deveined ez-peel easy-peel butterflied butterfly frenched tied rolled netted scored tenderized " +
  "split halved quartered spatchcocked whole-muscle chopped-and-formed " +
  // cooked in or served from ("skillet cornbread", "sheet-pan chicken", "one-pot pasta", "submarine sandwiches")
  "iron freezer fryer broiler roaster stone glass string steamer skillet sheet-pan one-pot one-pan slow-cooker crockpot instant-pot air-fryer dutch-oven cast-iron submarine " +
  // texture, shape and form
  "silken silky firm extra-firm medium-firm super-firm soft-style pressed puffed fried baked shaped " +
  "globe globes round oblong long short slender baby mini tiny small petite little big jumbo giant colossal super-colossal " +
  "extra-jumbo extra-large xl large medium size sized bite-size bite-sized snack-size fun-size king-size family-size " +
  "burrito-size burrito-sized taco-size taco-sized fajita-size fajita-sized fajita-style street street-style street-taco " +
  "sandwich-size sandwich-sized slider-size cocktail-size party-size restaurant restaurant-style takeout take-out " +
  "rigate rigati lisce lisci mezze mezzi lunghi corti piccoli grandi " +
  "half shell half-shell bird bird's birds " +
  "chunk chunks chunky tidbit tidbits bits pieces slices sliced spears halves wedges strips ribbons coins rounds rings " +
  // preparation state and origin
  "premade pre-made ready-made ready-to-bake ready-to-eat ready-to-use ready-to-cook ready-to-serve heat-and-serve " +
  "shelf-stable refrigerated frozen thawed fresh-frozen flash-frozen individually-frozen iqf " +
  "store-bought storebought homemade home-made house-made housemade scratch-made handmade hand-made hand-rolled " +
  "hand-stretched hand-pulled hand-cut hand-picked small-batch craft artisan artisanal heritage heirloom heritage-breed " +
  "pastured pasture-raised free-range cage-free air-chilled grass-fed grass-finished grain-finished corn-fed " +
  "wagyu kobe angus black-angus certified hereford berkshire kurobuta duroc iberico mangalitsa tamworth jidori bresse " +
  "muscovy pekin peking moulard long-island " +
  "hickory applewood apple-wood mesquite cherrywood maple-cured sugar-cured honey-cured dry-cured country-cured " +
  "uncured nitrate-free hardwood double-smoked wood-fired wood-smoked stone-baked brick-oven kettle-boiled " +
  "natural-casing skinless-style casing-free " +
  "low-moisture whole-milk part-skim reduced-fat 2% 1% fat-free skim nonfat full-cream double-cream triple-cream " +
  "aged extra-aged young mild sharp extra-sharp vintage reserve " +
  "dry-packed wet-packed oil-packed water-packed in-oil in-water in-brine brine-packed " +
  "seedless seeded pitted unpitted cored stemmed destemmed hulled shelled unshelled blanched unblanched " +
  "salted unsalted lightly-salted sea-salted roasted dry-roasted honey-roasted raw sprouted activated " +
  "sweetened unsweetened lightly-sweetened sugar-free no-sugar-added " +
  "regular original classic traditional authentic style-style deluxe gourmet premium select choice prime fancy " +
  "extra-fancy grade-a grade-aa no.1 number-one " +
  // regions and cuisines as adjectives
  "thai vietnamese chinese cantonese sichuan szechuan hunan taiwanese japanese okinawan korean filipino indonesian " +
  "malaysian singaporean burmese cambodian laotian indian punjabi bengali gujarati keralan goan south-indian " +
  "pakistani afghan persian iranian iraqi lebanese syrian turkish armenian georgian israeli palestinian jordanian " +
  "egyptian moroccan tunisian algerian ethiopian eritrean nigerian ghanaian senegalese south-african kenyan " +
  "mexican oaxacan yucatecan tex-mex texan californian cuban puerto-rican dominican jamaican trinidadian haitian " +
  "caribbean brazilian peruvian argentinian argentine chilean colombian venezuelan salvadoran guatemalan honduran " +
  "italian sicilian neapolitan roman tuscan genovese ligurian venetian milanese bolognese calabrian sardinian " +
  "french provencal provençal parisian burgundian alsatian breton norman spanish basque catalan andalusian galician " +
  "portuguese greek cypriot balkan croatian serbian bosnian bulgarian romanian hungarian czech slovak polish " +
  "ukrainian russian german bavarian austrian viennese swiss belgian dutch danish swedish norwegian finnish " +
  "icelandic british english scottish irish welsh cornish yorkshire american southern cajun creole new-england " +
  "new-york chicago-style detroit-style philly kansas-city memphis carolina texas-style hawaiian alaskan canadian " +
  "nashville buffalo-style maryland chesapeake maine gulf pacific atlantic alaska norwegian scottish faroe " +
  // flavours and styles of products
  "flavored flavoured unflavored plain natural original lite light diet zero reduced low no-salt-added " +
  "garlic-herb herb-and-garlic chive-and-onion everything cinnamon-raisin blueberry honey-wheat sesame poppy " +
  "multigrain whole-grain wholegrain whole-wheat wholemeal seeded sprouted gluten-free grain-free keto low-carb " +
  "vegan vegetarian plant-based meatless dairy-free egg-free nut-free soy-free paleo organic non-gmo kosher halal";
