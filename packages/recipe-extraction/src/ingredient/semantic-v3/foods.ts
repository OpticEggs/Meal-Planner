/**
 * semantic-v2 · RECOGNISED FOOD (PHASE-2B-PLAN §6.1, CONTRACT §12.8 "uncertain lines go to needs_review").
 *
 * On a line whose amount is a bare count or a count unit, an unknown head noun may be equipment ("1 comal"), a measure
 * ("1 tot dark rum") or a food: only a recognised food is read `ready`. The lexicons below are built by WORD CLASS —
 * produce, meat and seafood with their cuts and dishes, breads and baked goods, dairy and eggs, prepared foods and
 * dishes, sweets and snacks, drinks, herbs, spices and condiments, nuts, seeds, grains, legumes and pasta — plus the
 * modifier classes (forms, preparations, colours, sizes, qualities, varieties, origins, shapes and cuts used inside
 * food names). They are general English food vocabulary written from the classes, not lists of test inputs.
 *
 * Words are lower case, without diacritics, mostly singular: `foodWord` also accepts the regular plurals ("cherries",
 * "tomatoes", "loaves", "radishes") and hyphenated words whose parts are recognised ("sun-dried", "jalapeno-cheddar").
 */
import { APPLIANCE_WORDS, EQUIPMENT_MATERIAL_WORDS, EQUIPMENT_TOOL_HEADS, EQUIPMENT_VESSEL_HEADS, KITCHEN_ACTION_VERBS, PART_NOUNS, ROMANCE_JOINERS, UNKNOWN_MEASURES, unitOfWord } from "./lexicon";
import {
  BAKED_MORE, CONDIMENTS_MORE, DAIRY_MORE, DISHES_MORE, DRINKS_MORE, FRUITS_MORE, HERBS_MORE, MEATS_MORE, MORE_MODIFIERS, MUSHROOMS_MORE,
  NUTS_GRAINS_MORE, PANTRY_MORE, SEAFOOD_MORE, SPICES_MORE, SWEETS_MORE, VEGETABLES_MORE,
} from "./foods-more";

const words = (s: string): string[] => s.trim().split(/\s+/);
const setOf = (...parts: string[]): ReadonlySet<string> => new Set(parts.flatMap(words));

// --- Foods by class ---------------------------------------------------------------------------------

/** Fruits. */
const FRUITS =
  "apple apricot avocado banana plantain berry blackberry blueberry boysenberry cranberry currant elderberry gooseberry huckleberry lingonberry " +
  "loganberry mulberry raspberry strawberry cloudberry goji acai cherry grape raisin sultana date fig guava kiwi kiwifruit lemon lime citron " +
  "grapefruit orange clementine mandarin tangerine tangelo satsuma kumquat pomelo yuzu bergamot mango melon cantaloupe honeydew watermelon " +
  "muskmelon casaba papaya passionfruit passion pineapple pear quince nectarine peach plum prune damson greengage persimmon pomegranate aril " +
  "lychee litchi longan rambutan mangosteen durian jackfruit breadfruit starfruit carambola dragonfruit pitaya tamarind feijoa loquat " +
  "physalis gooseberries rhubarb olive coconut cherimoya soursop sapote jujube medlar salmonberry marionberry tayberry aronia sloe rowan " +
  "crabapple pluot aprium tomatillo kiwiberry fruit fruits citrus zest rind";

/** Vegetables. */
const VEGETABLES =
  "artichoke arugula rocket asparagus aubergine eggplant bean beet beetroot bok choy choi pak broccoli broccolini rapini rabe brussels sprout " +
  "cabbage carrot cauliflower celeriac celery chard collard collards corn maize cucumber gherkin cornichon courgette zucchini squash pumpkin " +
  "marrow endive escarole frisee radicchio fennel garlic ginger galangal turmeric horseradish wasabi jicama kale kohlrabi leek lettuce romaine " +
  "iceberg bibb boston butterhead mesclun mache watercress cress microgreen microgreens mushroom okra onion shallot scallion chive ramp ramps " +
  "parsnip pea peas snowpea pepper capsicum chili chile chilli jalapeno serrano habanero poblano ancho chipotle anaheim cayenne guajillo pasilla " +
  "arbol thai scotch bonnet padron shishito pimiento pimento potato yam taro cassava yuca manioc malanga radish daikon rutabaga swede turnip " +
  "salsify shoot sprout sprouts spinach sorrel tomato tomatillo vegetable vegetables veggie veggies greens green chicory dandelion purslane " +
  "nettle fiddlehead burdock lotus water chestnut bamboo bean sprout edamame lentil sunchoke artichokes cardoon kombu nori wakame seaweed kelp " +
  "dulse hijiki arame samphire mizuna tatsoi komatsuna gai lan choy sum yu choy morning glory amaranth callaloo plantain jerusalem napa savoy " +
  "kalette romanesco cauliflower florets floret head stalk spear heart hearts leaf leaves stem stems root roots tuber bulb ear cob kernel kernels";

/** Mushrooms. */
const MUSHROOMS =
  "mushroom shiitake portobello portabella portobella cremini crimini button oyster enoki chanterelle morel porcini cep maitake shimeji " +
  "trumpet truffle truffles lobster chestnut hedgehog beech matsutake ear cloud black fungus fungi";

/** Herbs. */
const HERBS =
  "basil parsley cilantro coriander dill mint spearmint peppermint oregano marjoram thyme rosemary sage tarragon chervil chives chive lovage " +
  "lemongrass bay laurel curry leaf leaves epazote shiso perilla savory sorrel borage hyssop lavender rue culantro herb herbs bouquet garni " +
  "fines herbes mitsuba fenugreek methi kaffir makrut pandan";

/** Spices, seasonings, salt and pepper. */
const SPICES =
  "spice spices seasoning seasonings salt pepper peppercorn peppercorns allspice anise aniseed star cardamom cinnamon cassia clove cloves cumin " +
  "caraway coriander fennel fenugreek ginger mace nutmeg paprika pimenton saffron sumac turmeric vanilla bean pod pods ajwain amchur asafoetida " +
  "hing nigella kalonji mustard seed celery juniper berry berries sansho sichuan szechuan peppercorn grains paradise urfa aleppo marash espelette " +
  "chili chilli flake flakes powder garam masala curry five-spice ras hanout baharat berbere dukkah za'atar zaatar shichimi togarashi furikake " +
  "jerk adobo sazon cajun creole chaat chipotle ancho smoked paprika msg monosodium glutamate bouillon stock cube cubes granules";

/** Condiments, sauces, dressings, spreads, pickles, oils, vinegars, sweeteners. */
const CONDIMENTS =
  "sauce sauces ketchup catsup mustard mayonnaise mayo aioli relish salsa pico gallo guacamole hummus hommus tahini pesto chutney jam jelly " +
  "preserve preserves marmalade curd compote coulis puree paste concentrate dressing vinaigrette marinade glaze gravy dip dips spread butter " +
  "vinegar oil oils ghee lard shortening tallow schmaltz drippings soy shoyu tamari teriyaki hoisin oyster fish worcestershire sriracha tabasco " +
  "harissa sambal gochujang doenjang miso chili crisp oelek ponzu mirin sake cooking wine sherry vermouth marsala madeira port mole enchilada " +
  "barbecue bbq buffalo ranch caesar thousand island blue cheese tartar tzatziki raita chimichurri romesco salsa verde gremolata pistou tapenade " +
  "muhammara baba ganoush ganouj labneh pickle pickles pickled caper capers olive olives sauerkraut kimchi giardiniera piccalilli chow chowchow " +
  "honey syrup molasses treacle agave nectar sugar sweetener stevia sucralose erythritol xylitol monk fruit maple sorghum corn glucose " +
  "dextrose fructose invert caramel dulce leche butterscotch fudge ganache frosting icing fondant marzipan almond paste praline nutella " +
  "spread vegemite marmite bovril sambal ketjap kecap manis nam pla nuoc cham fish sauce xo char siu plum duck sweet sour hot steak a1 " +
  "horseradish wasabi cocktail remoulade salad cream sandwich chimichurri sofrito recaito mojo adobo achiote annatto liquid smoke bitters " +
  "extract extracts essence flavoring flavouring rosewater orangewater water rose orange blossom";

/** Meat, poultry and game, with cuts and products. */
const MEATS =
  "meat meats beef veal pork lamb mutton goat venison bison buffalo elk boar rabbit hare chicken hen capon poussin cornish turkey duck duckling " +
  "goose quail pheasant partridge squab pigeon guinea fowl ostrich emu kangaroo alligator frog ham bacon pancetta prosciutto guanciale lardon " +
  "lardons speck jamon serrano iberico coppa capicola mortadella salami pepperoni chorizo soppressata sausage sausages bratwurst kielbasa " +
  "andouille boudin knackwurst weisswurst frankfurter frank hot dog hotdog wiener weiner bologna liverwurst braunschweiger pastrami corned " +
  "brisket roast steak steaks chop chops cutlet cutlets loin tenderloin sirloin ribeye rib eye strip filet fillet mignon porterhouse t-bone " +
  "tbone flank skirt flatiron chuck shank shoulder butt blade round rump topside silverside brisket oxtail tail tongue cheek cheeks " +
  "jowl belly side spare spareribs rib ribs riblet riblets baby back country-style short leg legs thigh thighs drumstick drumsticks wing wings " +
  "wingette drumette breast breasts tender tenders tenderloins giblets gizzard gizzards heart hearts liver livers kidney kidneys sweetbread " +
  "sweetbreads tripe marrow bone bones neck necks feet foot trotter trotters hock hocks knuckle knuckles crown saddle haunch " +
  "medallion medallions scallopini scaloppine escalope paillard schnitzel cube mince minced ground burger burgers patty patties meatball " +
  "meatballs meatloaf jerky biltong confit rillettes pate terrine foie gras sausage links link chipolata merguez boerewors salchicha longaniza " +
  "lap cheong cha siu spam corned carcass whole nugget nuggets popcorn cutlet gyro " +
  "shawarma kebab kabob souvlaki satay yakitori carnitas barbacoa birria al pastor suadero tinga pulled shredded rotisserie " +
  "stewing deli lunchmeat lunch cold cuts cold-cuts pigs blanket";

/** Fish and seafood. */
const SEAFOOD =
  "fish seafood shellfish salmon trout char arctic steelhead tuna albacore ahi bonito skipjack yellowfin bluefin cod haddock pollock pollack " +
  "hake whiting halibut flounder sole plaice turbot brill dab fluke tilapia catfish carp perch pike walleye bass seabass branzino bream " +
  "snapper grouper mahi mahi-mahi dorado swordfish marlin mackerel kingfish sardine sardines pilchard anchovy anchovies herring kipper kippers " +
  "sprat sprats smelt smelts whitebait eel unagi monkfish skate ray shark barramundi sablefish butterfish cobia rockfish lingcod pompano " +
  "wahoo opah escolar orange roughy roughy tilefish sturgeon caviar roe ikura tobiko masago shrimp prawn prawns scampi langoustine langostino " +
  "crawfish crayfish lobster lobsters crab crabs crabmeat king snow dungeness blue soft-shell softshell claw claws leg legs tail tails " +
  "clam clams cockle cockles mussel mussels oyster oysters scallop scallops abalone conch whelk periwinkle sea urchin uni squid calamari " +
  "octopus cuttlefish surimi imitation fishcake fishcakes fishball fishballs bacalao salt cod lox gravlax smoked kippered tinned fillet fillets " +
  "filet filets steak steaks loin loins belly collar cheeks head tail roe sashimi sushi tempura cake cakes finger";

/** Dairy, eggs and their alternatives. */
const DAIRY =
  "milk buttermilk cream creamer half-and-half butter ghee yogurt yoghurt kefir skyr quark fromage frais curd curds whey casein egg eggs yolk " +
  "yolks white whites cheese cheeses cheddar mozzarella parmesan parmigiano reggiano grana padano pecorino romano asiago provolone swiss " +
  "emmental emmentaler gruyere comte jarlsberg gouda edam havarti muenster munster monterey jack colby pepper pepperjack brie camembert " +
  "feta goat chevre ricotta mascarpone burrata stracciatella fontina taleggio gorgonzola roquefort stilton danish blue manchego halloumi " +
  "paneer queso fresco cotija oaxaca chihuahua panela anejo cream cottage farmer's farmer neufchatel boursin velveeta american " +
  "cheddar-jack colby-jack raclette reblochon epoisses limburger wensleydale cheshire gloucester leicester caerphilly lancashire double " +
  "triple creme crème fraiche sour soured clotted custard pudding ice cream gelato sorbet sherbet frozen yogurt froyo milkshake shake " +
  "evaporated condensed powdered dry nonfat skim whole lowfat almond oat soy rice coconut cashew hemp macadamia pea dairy non-dairy vegan " +
  "plant-based substitute replacer ";

/** Breads, doughs and baked goods. */
const BAKED =
  "bread breads loaf loaves roll rolls bun buns bagel bagels baguette baguettes boule batard ciabatta focaccia sourdough brioche challah " +
  "pumpernickel rye multigrain whole wheat white wheat potato naan nan pita pitta lavash flatbread flatbreads tortilla tortillas wrap wraps " +
  "chapati chapatti roti paratha puri papadum pappadam injera arepa arepas pupusa pupusas sope sopes gordita gorditas tostada tostadas taco " +
  "tacos shell shells crust crusts pie pies tart tarts tartlet tartlets quiche galette crostata pastry pastries puff phyllo filo strudel " +
  "croissant croissants danish danishes muffin muffins english crumpet crumpets scone scones biscuit biscuits cracker crackers matzo matzah " +
  "matzoh breadstick breadsticks grissini crouton croutons breadcrumb breadcrumbs crumb crumbs panko stuffing dressing cornbread johnnycake " +
  "hush puppies hushpuppies pancake pancakes waffle waffles crepe crepes blini blintz blintzes french toast doughnut doughnuts donut donuts " +
  "cruller beignet beignets churro churros fritter fritters cake cakes cupcake cupcakes cheesecake cheesecakes brownie brownies blondie " +
  "blondies cookie cookies biscotti macaron macarons macaroon macaroons shortbread snickerdoodle snickerdoodles gingersnap gingersnaps " +
  "gingerbread ladyfinger ladyfingers savoiardi wafer wafers cone cones eclair eclairs profiterole profiteroles cream puff puffs cannoli " +
  "baklava rugelach kolache kolaches pretzel pretzels bialy bialys english muffin hamburger hotdog slider sliders sub hoagie hero kaiser " +
  "sandwich sandwiches panini paninis toast toasts bruschetta crostini dough doughs batter starter sponge levain yeast leaven pizza pizzas " +
  "calzone calzones stromboli empanada empanadas pasty pasties samosa samosas pierogi pierogies pirogi knish knishes dumpling dumplings " +
  "gyoza potsticker potstickers wonton wontons dim sum bao baos hum pastry cobbler crumble crisp betty buckle grunt pandowdy shortcake " +
  "torte gateau trifle tiramisu pavlova meringue meringues souffle eclair whoopie pie bar bars square squares roulade bundt pound " +
  "angel food sponge chiffon babka stollen panettone pandoro king kringle cinnamon bun sticky twist twists";

/** Prepared foods and dishes. */
const DISHES =
  "soup soups stew stews chili chowder bisque broth stock consomme gumbo jambalaya etouffee curry curries dal dhal daal korma tikka masala " +
  "vindaloo biryani pilaf pilau risotto paella casserole casseroles lasagna lasagne moussaka pastitsio ratatouille gratin hotpot shepherd's " +
  "cottage pie pies potpie quiche frittata omelet omelette omelettes scramble hash salad salads slaw coleslaw salsa burrito " +
  "burritos enchilada enchiladas quesadilla quesadillas fajita fajitas nachos taquito taquitos flauta flautas chimichanga tamale tamales " +
  "tostada chalupa gordita pozole menudo ceviche poke sushi roll rolls maki nigiri onigiri temaki gimbap kimbap bibimbap bulgogi japchae " +
  "ramen udon soba pho bun vermicelli pad thai larb satay rendang laksa nasi goreng mee spring summer egg roll rolls lumpia banh mi " +
  "sandwich wrap wraps burger burgers sliders hot dog dogs corndog corn dog pizza flatbread calzone pasta macaroni mac noodle noodles " +
  "dumpling dumplings pierogi gnocchi ravioli tortellini tortelloni agnolotti cappelletti manicotti cannelloni stuffed shells meatballs " +
  "meatloaf kebab kebabs kofta falafel shawarma gyro gyros souvlaki hummus tabbouleh tabouli fattoush baba ganoush dolma dolmas " +
  "dolmades spanakopita tiropita borscht goulash pierogi schnitzel sauerbraten spaetzle fondue raclette quiche crepes croque monsieur " +
  "bouillabaisse cassoulet coq vin bourguignon blanquette tartiflette pot-au-feu ratatouille pissaladiere socca polenta grits congee jook " +
  "porridge oatmeal muesli granola cereal parfait smoothie acai pudding custard flan creme brulee panna cotta mousse jello gelatin " +
  "terrine pate rillettes croquette croquettes arancini fritter fritters latke latkes rosti hash brown browns tots tater fries chips crisps " +
  "wedges dip dips spread charcuterie crudites antipasto antipasti tapas mezze appetizer appetizers entree side sides " +
  "leftover leftovers meal dinner dinners lunch breakfast brunch snack snacks treat treats dessert desserts " +
  "lettuce-wrap stir-fry stirfry fried rice lo mein chow mein chop suey egg foo young katsu tonkatsu karaage tempura teriyaki yakitori " +
  "yakisoba okonomiyaki takoyaki tteokbokki kimchi jjigae sundubu samgyeopsal adobo sinigang pancit lechon arroz con pollo mofongo " +
  "ropa vieja picadillo empanada ceviche causa feijoada moqueca coxinha pao de queijo bobotie bunny chow tagine couscous shakshuka " +
  "menemen borek lahmacun pide manti plov shashlik pelmeni vareniki blini kasha stroganoff chicken-fried country-fried pot-roast";

/** Sweets, candy and snacks. */
const SWEETS =
  "candy candies chocolate chocolates truffle truffles bonbon bonbons caramel caramels toffee toffees fudge brittle nougat marshmallow " +
  "marshmallows gummy gummies gummi jellybean jellybeans licorice liquorice lollipop lollipops lolly lollies mint mints peppermint gum " +
  "chewing bubblegum sprinkle sprinkles nonpareils jimmies hundreds thousands chip chips kisses kiss bar bars " +
  "cocoa cacao nib nibs couverture callets wafer wafers cookie cookies oreo oreos graham grahams pretzel pretzels popcorn chip chips crisps " +
  "cracker crackers goldfish cheez-it cheez-its rice cake cakes puff puffs cheeto cheetos dorito doritos frito fritos tortilla pita bagel " +
  "trail mix granola bar bars energy protein cluster clusters bark brittle praline pralines turtle turtles peanut butter m&m m&ms " +
  "skittles snickers twix reese's reeses kit kat hershey's hersheys heath butterfinger milky way rolo rolos smarties junior mints " +
  "starburst twizzlers jolly rancher dum dums tootsie roll rolls sour patch kids swedish fish nerds pez candy corn peeps cotton candy " +
  "marzipan halva halvah turkish delight baklava mochi daifuku dango wagashi pocky hi-chew ice pop popsicle popsicles icee slushie freezie " +
  "jello jell-o pudding fruit snacks leather roll-ups gushers raisinets goobers jordan almonds dragees dragee meringue kiss";

/** Drinks. */
const DRINKS =
  "water seltzer soda club tonic sparkling mineral juice juices nectar lemonade limeade punch cider kombucha kvass smoothie shake coffee " +
  "espresso ristretto americano latte cappuccino mocha macchiato cold brew tea teas chai matcha sencha oolong rooibos chamomile earl grey " +
  "jasmine hibiscus herbal yerba mate cocoa hot chocolate milk soymilk wine wines red white rose rosé champagne prosecco cava sparkling " +
  "riesling chardonnay sauvignon blanc pinot noir grigio gris merlot cabernet malbec zinfandel shiraz syrah sangiovese chianti rioja " +
  "beaujolais moscato sherry port madeira marsala vermouth sake soju mirin shaoxing beer beers ale lager stout porter pilsner ipa cider " +
  "mead spirit spirits liquor liqueur vodka gin rum whiskey whisky bourbon scotch rye brandy cognac armagnac calvados grappa pisco tequila " +
  "mezcal absinthe ouzo raki arak sambuca anisette pastis amaretto frangelico kahlua baileys cointreau triple sec grand marnier chartreuse " +
  "benedictine campari aperol limoncello schnapps kirsch kirschwasser slivovitz eau de vie creme de cassis menthe cacao bitters angostura " +
  "peychaud's grenadine orgeat falernum simple syrup cordial squash sports drink gatorade energy cola coke pepsi sprite ginger ale beer " +
  "root sarsaparilla dr pepper 7up fanta mountain dew lemon-lime clamato v8 tomato coconut horchata agua fresca kefir lassi ayran " +
  "eggnog hot toddy mulled sangria margarita mojito martini daiquiri";

/** Nuts, seeds, grains, flours, legumes and pasta. */
const NUTS_GRAINS =
  "nut nuts almond almonds walnut walnuts pecan pecans hazelnut hazelnuts filbert filberts cashew cashews pistachio pistachios peanut peanuts " +
  "macadamia macadamias brazil pine pinenut pinenuts pignoli chestnut chestnuts coconut acorn seed seeds sunflower pumpkin pepita pepitas " +
  "sesame flax flaxseed chia hemp poppy nigella melon watermelon grain grains rice wild basmati jasmine arborio carnaroli sushi glutinous " +
  "sticky brown black red forbidden bomba calrose wheat berry berries farro spelt emmer einkorn kamut freekeh bulgur bulghur couscous " +
  "israeli pearl barley oat oats oatmeal groats steel-cut rolled quick quinoa amaranth millet sorghum teff buckwheat kasha rye triticale " +
  "corn cornmeal polenta grits hominy masa harina flour flours starch cornstarch cornflour arrowroot tapioca semolina durum bran germ " +
  "gluten vital meal almond-meal breadcrumbs panko matzo meal legume legumes bean beans black kidney pinto navy cannellini great northern " +
  "lima butter fava broad garbanzo chickpea chickpeas lentil lentils split pea peas black-eyed blackeyed cowpea adzuki azuki mung urad " +
  "soybean soybeans edamame tofu tempeh seitan yuba natto textured vegetable protein tvp pasta spaghetti spaghettini linguine fettuccine " +
  "fettuccini tagliatelle pappardelle bucatini capellini angel hair vermicelli penne rigatoni ziti mostaccioli fusilli rotini farfalle " +
  "bowtie bow tie orecchiette conchiglie shell shells cavatappi cavatelli gemelli radiatori campanelle macaroni elbow elbows ditalini orzo " +
  "acini pepe stelline pastina lasagna lasagne noodle noodles ramen udon soba somen rice-noodles cellophane egg ravioli tortellini " +
  "gnocchi spaetzle couscous fregola lumache paccheri calamarata mafalde trofie strozzapreti casarecce garganelli";

/** Other pantry foods. */
const PANTRY =
  "yeast baking soda powder bicarbonate cream tartar gelatin gelatine agar pectin cornstarch xanthan guar lecithin salt sugar flour cocoa " +
  "chocolate chip chips coconut flake flakes shredded raisin raisins currants dried fruit candied citron cherries maraschino " +
  "applesauce apple butter pumpkin puree pie filling condensed evaporated milk powder bouillon stock broth base concentrate demi-glace " +
  "tomato tomatoes paste sauce passata crushed diced whole peeled stewed sun-dried roasted pepper peppers pimientos artichoke hearts olives " +
  "capers anchovies sardines tuna salmon crab chicken spam beans chickpeas lentils corn peas carrots mixed vegetables soup cereal cornflakes " +
  "flakes crispies cheerios bran oats granola muesli crackers wafers cookies breadcrumbs croutons stuffing mix cake brownie muffin pancake " +
  "waffle biscuit cornbread pizza dough crust crescent puff pastry phyllo wonton egg roll spring nori tortillas " +
  "taco shells tostadas chips salsa jarred canned tinned frozen packaged boxed instant mix mixes seasoning packet envelope cube cubes";

/** Food names whose head is a part, a portion or a shape, and cut and dish words used inside food names. */
const FOOD_NAME_PARTS =
  "back eye strip loin cube sheet wedge finger stone slab drop sprinkle link angel hair bow tie elbow tube pinwheel pinwheels " +
  "half halves quarter quarters piece pieces chunk chunks bit bits slice slices round rounds ring rings stick sticks spear spears wedge " +
  "wedges cube cubes dice crumble crumbles crumb crumbs shaving shavings shred shreds flake flakes strip strips segment segments floret " +
  "florets cutlet cutlets fillet fillets filet filets steak steaks chop chops tender tenders nugget nuggets ball balls patty patties cake " +
  "cakes bite bites cup cups shell shells bowl bowls boat boats basket baskets cone cones nest nests log logs bar bars square squares " +
  "triangle triangles stack stacks sheet sheets round crown rack racks leg legs claw claws tail tails knuckle hock shank bone bones " +
  "thigh breast wing drumstick club fish surf turf mac cheese sticker stickers pocket pockets puff puffs twist twists braid knot knots " +
  "pinwheel bomb bombs drop slider sliders paper";

/**
 * VARIETIES, CULTIVARS AND STYLES, written in lower case before a food ("navel oranges", "russet potatoes", "kalamata
 * olives", "littleneck clams", "butternut squash", "marinara"): produce cultivars, cuts, cheese and sauce styles.
 */
const VARIETIES =
  // citrus, apples, pears, stone fruit, grapes, berries, melons, bananas
  "balsamic sherry champagne malt rice-wine bell navel blood cara valencia seville meyer key persian eureka satsuma mandarin granny smith honeycrisp gala fuji braeburn jonagold " +
  "jonathan mcintosh macintosh cortland empire pink lady cripps golden delicious red delicious rome winesap northern spy pippin crispin " +
  "envy jazz ambrosia cosmic crisp bosc bartlett anjou comice asian seckel forelle starkrimson freestone clingstone donut saturn white " +
  "bing rainier sour tart montmorency morello concord thompson flame muscat champagne crimson cotton candy moon drops alphonso ataulfo " +
  "kent keitt tommy atkins honey kesar champagne cavendish manzano burro red lady finger plantain galia charentais crenshaw canary santa claus " +
  // potatoes, sweet potatoes, squash, onions, garlic, tomatoes, peppers, cucumbers, lettuces, cabbages
  "russet idaho yukon gold fingerling purple peruvian red bliss kennebec maris piper king edward jersey royal new creamer baby dutch " +
  "beauregard garnet jewel hannah japanese okinawan murasaki butternut acorn delicata kabocha hubbard buttercup spaghetti pattypan sugar " +
  "pie carnival turban calabaza cheese crookneck straight zephyr vidalia walla maui bermuda spanish cipollini pearl boiling cocktail " +
  "torpedo tropea elephant hardneck softneck roma plum san marzano beefsteak heirloom brandywine cherokee green zebra campari kumato " +
  "grape cherry sungold sweet million early girl celebrity better boy oxheart vine on-the-vine banana cubanelle hungarian wax piquillo " +
  "peppadew pepperoncini pepperoncino aji amarillo rocoto ghost carolina reaper bird's eye birds-eye fresno hatch new mexico long hot " +
  "kirby english persian lebanese armenian pickling slicing burpless little gem lollo rosso oak leaf red-leaf green-leaf butter bibb " +
  "boston iceberg romaine cos frisee mache lamb's napa savoy january king red cabbage tuscan lacinato dinosaur curly redbor baby " +
  // beans, rice, grains, olives, mushrooms, shellfish, fish
  "kidney pinto navy cannellini borlotti cranberry great northern lima butter fava broad flageolet adzuki mung urad anasazi tepary runner " +
  "haricot vert haricots verts romano wax yellow-wax string snap snow sugar-snap english garden split marrowfat " +
  "kalamata castelvetrano nicoise niçoise manzanilla gaeta cerignola picholine arbequina lucques mission ligurian taggiasca oil-cured " +
  "littleneck cherrystone quahog manila razor steamer topneck chowder bluepoint kumamoto belon olympia pacific atlantic gulf maine " +
  "alaskan sockeye coho chinook king pink keta chum atlantic rainbow brook lake speckled yellowtail hamachi bluefin ahi albacore " +
  "bay sea diver dry-packed jumbo lump backfin claw colossal tiger white brown spot gulf rock spiny red king snow dungeness blue " +
  // cheese and dairy styles, sauces, pasta shapes, breads
  "marinara arrabbiata puttanesca alfredo bolognese vodka carbonara amatriciana pomodoro napoletana primavera aglio olio cacio pepe " +
  "hollandaise bearnaise bechamel velouté veloute mornay beurre blanc demi glace remoulade chimichurri mojo sofrito adobo " +
  "saltine soda club water oyster animal graham wheat thin triscuit ritz goldfish butter round " +
  "sharp mild aged extra-sharp vintage smoked fresh whole-milk part-skim low-moisture buffalo bufala di bufala sheep's goat's cow's " +
  "pecorino-romano parmigiano-reggiano grana-padano queso blanco enchilada mexican-style italian-style taco-blend";

/** More foods by class: cuts, dishes, baked goods, sweets, drinks and pantry items not listed above. */
const MORE_FOODS =
  "topping toppings whip cane canes bear bears worm worms drop drops bonbon kiss bark crunch crisp cluster cap caps " +
  "thread threads strand strands 7-up 7up sprite water spray coloring colouring dye pocket pockets " +
  "marinara alfredo bolognese carbonara arrabbiata puttanesca amatriciana hollandaise bearnaise bechamel mornay remoulade aioli " +
  "frank franks weenie weenies sausage brat brats bratwurst wurst hotlink chorizo linguica longaniza morcilla blood boudin haggis " +
  "pastrami salami capocollo bresaola cecina lomo chistorra nduja 'nduja finocchiona cotechino zampone kassler leberkase landjaeger " +
  "roulade braciole porchetta gyro doner tri-tip tritip picanha coulotte sirloin-tip ball-tip bavette denver petite tender teres major " +
  "chuck-eye flap tafelspitz osso buco ossobuco spare-rib sparerib spareribs st louis rib-tips burnt ends pork-belly carnitas al-pastor " +
  "lechon chicharron chicharrones cracklings crackling rind rinds skin skins fatback suet caul " +
  "wingette wingettes lollipop lollipops airline supreme supremes oyster oysters giblet neckbone neckbones backbone carcass frame " +
  "cod-cheeks scrod pollock coley saithe ling hoki tilefish pompano porgy scup sheepshead drum redfish croaker spot mullet bluefish " +
  "shad herring alewife smelt capelin sprat brisling eel conger lamprey sablefish black-cod butterfish escolar opah tilapia swai basa " +
  "pangasius catfish crappie bluegill sunfish walleye pickerel muskellunge salmon trout char grayling whitefish cisco sturgeon paddlefish " +
  "naan nan kulcha bhatura roti chapati paratha parotta dosa idli vada uttapam appam puttu poori bhatoora papad papadum " +
  "khachapuri lavash markook pita pide simit bialy kaiser semmel brotchen pretzel laugen bagel bun bao mantou baozi youtiao " +
  "shaobing jianbing melonpan shokupan milk-bread conchas bolillo telera dulce de muerto rosca torta cemita " +
  "tortilla sope huarache tlayuda memela tostada totopos gordita panucho salbute pupusa arepa cachapa empanada pastelito " +
  "kolach kolache kolachky babka challah houska stollen panettone pandoro colomba bienenstich kuchen strudel streusel " +
  "madeleine financier canele cannele kouign-amann palmier palmiers sable sables tuile tuiles florentine florentines amaretti " +
  "pizzelle pizzelles biscotti cantucci ricciarelli sfogliatelle zeppole zeppola bombolone bomboloni cornetto maritozzo " +
  "lebkuchen pfeffernusse springerle speculoos speculaas stroopwafel stroopwafels oliebollen poffertjes appeltaart " +
  "alfajor alfajores polvorones mantecados churros bunuelos sopapilla sopapillas conchas empanadas tres leches flan " +
  "brigadeiro brigadeiros quindim pao beijinho cocada pastel " +
  "mochi daifuku dorayaki taiyaki dango manju yokan castella melonpan anpan " +
  "baklava kunafa knafeh basbousa halva halwa gulab jamun jalebi rasgulla barfi burfi ladoo laddu kheer kulfi peda sandesh " +
  "loukoumades galaktoboureko kataifi koulourakia kourabiedes melomakarona " +
  "whoopie moon pie twinkie twinkies ding dong ho ho cupcake snowball zinger fruitcake " +
  "lollipop lollies suckers sucker toffee taffy saltwater nougat praline divinity rock licorice gumdrop gumdrops " +
  "jujube jujubes gumball gumballs sourball jawbreaker jawbreakers peppermints wintergreen spearmint butterscotch caramels " +
  "fritos funyuns pringles ruffles tostitos sunchips cheetos takis bugles combos chex snack crackers pita-chips bagel-chips veggie-straws " +
  "seltzer kombucha cold-brew nitro frappuccino frappe affogato cortado flat white lungo doppio red-eye " +
  "lemonade arnold palmer sweet-tea iced-tea bubble boba milk-tea thai-tea teh tarik masala chai yerba guayusa " +
  "soda pop cola root-beer cream-soda birch-beer ginger-beer tonic bitter-lemon squash cordial shrub switchel " +
  "eggnog posset syllabub atole champurrado horchata tepache chicha agua de jamaica " +
  "pilsner lager ale ipa stout porter saison hefeweizen witbier lambic gose sour shandy radler kolsch bock doppelbock dunkel " +
  "pinot gris grigio gewurztraminer viognier chenin muscadet albarino gruner vermentino verdejo torrontes semillon " +
  "tempranillo grenache garnacha mourvedre carignan barbera nebbiolo dolcetto montepulciano primitivo nero davola aglianico " +
  "carmenere pinotage gamay cabernet franc petit verdot petite sirah " +
  "seed seeds kernel kernels groats berries flakes pearls nibs grits meal " +
  "teff fonio sorghum millet amaranth kaniwa job's tears wild-rice black-rice red-rice brown-rice sushi-rice " +
  "orecchiette strozzapreti trofie pici bigoli garganelli maltagliati tagliolini taglierini fettucine papardelle " +
  "rotelle ruote wagon wheels alphabet stelline anelli tubetti mezzi rigatoni penne-rigate ziti-rigati manicotti cannelloni " +
  "jumbo-shells conchiglioni lumaconi gnocchetti sardi malloreddus fregola sardinian couscous ptitim israeli " +
  "noodles cellophane bean-thread vermicelli bihon sotanghon mung-bean sweet-potato dangmyeon japchae " +
  "chow fun ho fun lo mein chow mein egg noodles wonton noodles ramen noodles udon soba somen hiyamugi kishimen shirataki " +
  "tteok rice-cakes mochi-cakes gnocchi dumplings spaetzle knoedel knodel pierogi pelmeni vareniki manti momo momos " +
  "gyoza jiaozi xiaolongbao wontons shumai siu mai har gow har-gow bao baozi char-siu-bao " +
  "falafel kofta kibbeh kebab kebob kabob shish tikka seekh boti chapli shami cutlet croquette croqueta croquetas " +
  "arancini supplì suppli panzerotti calzone stromboli piadina focaccia sfincione pinsa " +
  "biryani pulao pilaf pilau plov jollof paella fideua arroz risotto congee jook juk lugaw arroz-caldo " +
  "dal daal dhal sambar rasam kadhi chana chole rajma palak saag paneer korma vindaloo madras jalfrezi bhuna rogan josh " +
  "dopiaza balti makhani butter-chicken tandoori tikka-masala keema aloo gobi bhindi baingan bharta " +
  "pakora pakoras bhaji bhajis samosa samosas chaat pani puri bhel sev papdi vada pav pav bhaji dabeli kachori " +
  "raita chutney achar pickle kachumber salan " +
  "pho bun cha banh xeo banh cuon goi cuon bo kho bun bo hue cao lau com tam nem " +
  "tom yum kha gai pad see ew pad kra pao massaman panang green-curry red-curry yellow-curry khao soi larb som tam " +
  "rendang satay sate gado-gado nasi lemak mee goreng laksa char kway teow hokkien mee bak kut teh " +
  "adobo sinigang kare-kare lechon kawali sisig pancit lumpia tocino longganisa tapa bistek menudo caldereta afritada " +
  "bulgogi galbi kalbi japchae bibimbap kimchi-jjigae sundubu tteokbokki gimbap kimbap pajeon jeon banchan " +
  "teriyaki tonkatsu katsu karaage yakitori sukiyaki shabu-shabu oden okonomiyaki takoyaki onigiri donburi gyudon oyakodon " +
  "katsudon tempura agedashi miso-soup natto umeboshi tsukemono furikake ochazuke " +
  "mapo tofu kung pao gong bao general tso's orange-chicken sesame-chicken lo-mein fried-rice egg-foo-young chop-suey " +
  "char siu siu yuk peking duck hot-and-sour wonton-soup egg-drop dan dan zha jiang mian hot-pot " +
  "tagine couscous harira shakshuka shakshouka chermoula merguez bastilla pastilla brik " +
  "hummus baba-ganoush mutabal muhammara tabbouleh fattoush labneh foul ful medames shawarma manakish manoushe " +
  "dolma dolmas dolmades sarma yaprak borek burek gozleme lahmacun pide iskender doner adana kofte menemen " +
  "moussaka pastitsio spanakopita tiropita souvlaki gyros keftedes dolmadakia avgolemono fasolada gemista horiatiki " +
  "paella gazpacho salmorejo tortilla-espanola patatas bravas croquetas albondigas pisto fabada cocido pulpo gambas " +
  "ratatouille bouillabaisse cassoulet coq-au-vin boeuf bourguignon quiche croque-monsieur croque-madame soupe gratin " +
  "goulash gulyas paprikash lecso langos schnitzel sauerbraten rouladen spaetzle bratkartoffeln kartoffelsalat " +
  "pierogi bigos golabki kielbasa zurek barszcz borscht blini pelmeni stroganoff solyanka okroshka shchi kasha syrniki " +
  "fish-and-chips bangers mash shepherd's cottage pie toad-in-the-hole yorkshire pudding scotch eggs ploughman's " +
  "full-english bubble-and-squeak haggis neeps tatties cock-a-leekie cullen skink " +
  "feijoada moqueca coxinha pao-de-queijo acaraje vatapa churrasco farofa " +
  "ceviche causa lomo saltado aji-de-gallina anticuchos papa-a-la-huancaina " +
  "empanadas asado chimichurri milanesa provoleta locro choripan " +
  "ropa vieja picadillo mojo vaca frita lechon asado tostones maduros mofongo sancocho arroz-con-pollo " +
  "jerk ackee saltfish callaloo oxtail curry-goat festival bammy " +
  "jambalaya gumbo etouffee po'boy po-boy muffuletta beignet boudin dirty-rice red-beans hushpuppies grits shrimp-and-grits " +
  "biscuits-and-gravy chicken-and-waffles fried-chicken meatloaf pot-roast chicken-fried-steak mac-and-cheese " +
  "cornbread collard-greens succotash coleslaw potato-salad deviled-eggs pimento-cheese " +
  "sloppy joes sloppy-joes hamburger cheeseburger hot-dog corn-dog chili-dog reuben club blt patty-melt grilled-cheese " +
  "philly cheesesteak hoagie sub hero cubano medianoche torta banh-mi gyro wrap " +
  "nachos quesadilla burrito chimichanga enchilada taquito flauta tostada tamale pozole menudo birria barbacoa " +
  "carne asada pollo asado al pastor carnitas chile relleno rellenos mole elote esquites queso fundido " +
  "salsa roja verde pico de gallo guacamole crema " +
  "pancake pancakes flapjack flapjacks hotcake hotcakes crepe crepes waffle waffles french-toast dutch-baby " +
  "oatmeal porridge granola muesli overnight-oats chia-pudding parfait yogurt-bowl smoothie smoothies " +
  "omelette frittata scramble hash quiche strata benedict huevos rancheros migas chilaquiles breakfast-burrito " +
  "popsicle popsicles ice-pop paleta paletas gelato sorbet sherbet granita semifreddo spumoni sundae sundaes " +
  "banana-split float floats milkshake malt malts frappe slushy slushie snow-cone " +
  "jell-o jello gelatin panna-cotta pudding custard flan creme-brulee pot-de-creme mousse fool trifle tiramisu " +
  "cheesecake shortcake cobbler crisp crumble buckle betty pandowdy slump grunt clafoutis galette tart tarte " +
  "pie pies hand-pie hand-pies turnover turnovers strudel pastry danish kringle bear-claw cinnamon-roll sticky-bun " +
  "muffin muffins scone scones biscuit biscuits popover popovers crumpet crumpets english-muffin " +
  "cookie cookies brownie brownies blondie blondies bar bars square squares fudge truffle truffles bonbon bonbons " +
  "cake cakes cupcake cupcakes layer-cake sheet-cake bundt pound-cake angel-food sponge chiffon genoise " +
  "torte tortes gateau roulade jelly-roll swiss-roll yule log buche baba savarin charlotte dacquoise " +
  "macaron macarons macaroon macaroons meringue meringues pavlova eton mess " +
  "candy candies chocolates caramel caramels fudge brittle bark clusters " +
  "jam jams jelly jellies preserves marmalade conserve conserves compote butter curd spread " +
  "condiment condiments seasoning seasonings rub rubs marinade marinades brine sauce sauces dressing dressings dip dips " +
  "bouillon base concentrate stock broth fumet dashi consomme demi-glace glace " +
  "vegetable vegetables veggie veggies fruit fruits berry berries nut nuts seed seeds herb herbs spice spices " +
  "meat meats poultry fowl game seafood shellfish fish protein proteins grain grains legume legumes bean beans " +
  "noodle noodles pasta rice bread breads cheese cheeses dairy egg eggs " +
  "produce greens salad salads lettuces sprouts shoots microgreens herbs aromatics " +
  "cereal cereals crackers chips crisps snacks treats sweets candy desserts " +
  "beverage beverages drink drinks juice juices";

/** Still more foods by class: less common produce, regional foods, prepared items and snacks. */
const EXTRA_FOODS =
  // produce
  "chayote cactus nopal nopales nopalitos dragonfruit dragon pitahaya buddha's-hand scape scapes fiddleheads samphire " +
  "salsify scorzonera crosne crosnes oca ulluco mashua yacon jerusalem sunroot sunchokes topinambur celtuce gai choy yu tatsoi mibuna " +
  "komatsuna amaranth malabar ong choy water spinach kangkong pea shoots pea tendrils sunflower sprouts alfalfa radish sprouts broccoli sprouts " +
  "cardoon cardoons puntarelle castelfranco treviso tardivo catalogna agretti borage chicory purslane lamb's orach " +
  "loquat medlar mangosteen salak snakefruit rambutan longan langsat santol jabuticaba feijoa tamarillo pepino naranjilla lulo " +
  "soursop guanabana cherimoya atemoya sugar-apple sapodilla mamey canistel ackee breadfruit plantain pawpaw papaw persimmon hachiya fuyu " +
  "jujube ugli ugli-fruit yuzu sudachi kabosu calamansi calamondin finger-lime makrut bergamot citron etrog blood-orange cara-cara " +
  "kumquat limequat tangelo minneola clementine satsuma ortanique honeybell pummelo shaddock " +
  "huckleberry serviceberry saskatoon juneberry chokecherry chokeberry aronia sea-buckthorn barberry goldenberry gooseberry " +
  "dewberry thimbleberry wineberry salal elderflower rosehip rosehips hawthorn quince crabapple sloe damson mirabelle greengage " +
  "pluot plumcot aprium nectaplum peacotum white-peach donut-peach " +
  "jalapeño serrano fresno anaheim hatch cubanelle banana-pepper shishito padron pimientos piquillo peppadew pepperoncini cherry-pepper " +
  "manzano rocoto aji panca mirasol guajillo pasilla mulato cascabel arbol chiltepin pequin morita chipotle meco " +
  "ramp ramps fiddlehead morels chanterelles hen-of-the-woods lion's mane trumpet mushrooms king-oyster beech enokitake nameko " +
  "porcini cepes girolles pied de mouton black-trumpet truffle " +
  // herbs, spices, aromatics
  "culantro rau ram vietnamese-coriander ngo gai perilla shiso mitsuba sawtooth lemon-verbena verbena lemon-balm bergamot angelica " +
  "sweet-cicely woodruff pandan screwpine galangal fingerroot krachai zedoary amchoor anardana kokum kalpasi marathi mogga " +
  "kasoori methi fenugreek curry-leaves panch phoron chaat masala sambar podi rasam powder goda kitchen-king " +
  "mahleb mahlab mastic grains of paradise long pepper cubeb tasmanian pepperberry wattleseed akudjura " +
  "togarashi sansho shichimi yuzu-kosho kosho gomasio furikake " +
  // meat, poultry, seafood extras
  "tentacle tentacles tubes mantle wings flappers flats drumettes oysters sweetbreads tripe honeycomb chitterlings chitlins " +
  "scrapple souse headcheese pemmican jerky biltong droewors cecina tasajo carne seca bulalo " +
  "loin-back chuck-eye flatiron skirt-steak hanger-steak culotte rump-cap sirloin-cap spider-steak oyster-blade " +
  "ox oxtail osso-buco veal-shank shank pork-hock trotter jowl cheek guanciale " +
  "branzino orata dorade loup turbot john-dory gurnard monk kingklip barramundi arctic-char lake-trout perch zander " +
  "geoduck razor-clams cockles periwinkles whelks winkles abalone sea-cucumber jellyfish bottarga mullet-roe karasumi tarama " +
  "langostinos crawdads mudbugs yabbies marron bugs balmain moreton " +
  // dairy, eggs extras
  "bocconcini ovoline ciliegine perline mozzarella-pearls stracchino crescenza robiola scamorza caciocavallo provola " +
  "ricotta-salata cotija queso-fresco queso-blanco queso-anejo queso-oaxaca requeson panela " +
  "labneh lebneh shrikhand dahi chhena khoa khoya mawa malai rabri " +
  "kaymak clotted-cream double-cream single-cream soured-cream creme-fraiche smetana tvorog farmer's-cheese pot-cheese " +
  "cheddar-cheese colby-jack pepper-jack habanero-jack ghost-pepper-jack smoked-gouda aged-gouda " +
  // breads, baked, sweets extras
  "disc discs disk disks round rounds hole holes bomb bombs bite " +
  "fortune lucky almond-cookies wafer-cookies sandwich-cookies thumbprint thumbprints rugelach hamantaschen mandelbrot " +
  "linzer kipferl vanillekipferl spritz pfeffernusse lebkuchen springerle stollen " +
  "pretzel-rods pretzel-twists pretzel-bites pretzel-buns soft-pretzels " +
  "popover yorkshire crumpet pikelet bannock damper soda-bread barmbrak brack teacake teacakes eccles chelsea bath-buns " +
  "hot-cross-buns lardy saffron-buns semla kanelbulle kardemummabulle pulla " +
  "mantou bao gua-bao mooncake mooncakes egg-tart egg-tarts pineapple-bun polo-bun cocktail-bun sesame-balls jian-dui tangyuan " +
  "mochi-balls dango onigiri senbei arare rice-crackers shrimp-chips prawn-crackers krupuk kerupuk emping " +
  "kettle-corn caramel-corn popcorn-balls cracker-jack poppycock " +
  "life savers lifesavers smarties rolos rolo reese's reeses hershey's kisses snickers twix butterfinger crunch baby-ruth milky-way " +
  "three-musketeers almond-joy mounds york junior-mints andes peeps whoppers milk-duds raisinets goobers jujyfruits mike-and-ike " +
  "hot-tamales red-hots sixlets runts nerds airheads laffy-taffy starburst skittles twizzlers red-vines swedish-fish sour-patch " +
  "gummy-bears gummy-worms haribo jelly-babies wine-gums fruit-pastilles maltesers aero flake crunchie twirl buttons smarties " +
  "toblerone ferrero rocher lindor kinder bueno nutella ovomaltine ovaltine horlicks milo bournvita " +
  "rotel ro-tel velveeta cheez whiz spam vienna-sausages deviled-ham potted-meat " +
  "tater-tots tots hash-browns home-fries steak-fries curly-fries waffle-fries crinkle-cut shoestring wedges potato-skins " +
  "mozzarella-sticks jalapeno-poppers onion-rings onion-petals cheese-curds fried-pickles hush-puppies corn-dogs pigs-in-blankets " +
  "pizza-rolls bagel-bites hot-pockets egg-rolls spring-rolls crab-rangoon rangoon rangoons wontons potstickers dumplings " +
  "glaze glazes reduction drizzle syrup coulis sauce gravy jus au-jus pan-sauce " +
  "canola rapeseed safflower sunflower grapeseed peanut walnut hazelnut pumpkin-seed avocado palm coconut mct ghee schmaltz duck-fat " +
  "beef-tallow bacon-fat bacon-grease lard crisco shortening margarine oleo spread " +
  "palm hearts-of-palm heart-of-palm sprouts shoots " +
  "noodles wide extra-wide medium-wide fine thin thick flat round hollow ridged smooth " +
  // drinks and pantry extras
  "kool-aid koolaid tang crystal-light powerade vitaminwater bai liquid-iv pedialyte red-bull monster rockstar celsius " +
  "nesquik carnation instant-breakfast ensure boost slimfast " +
  "bisquick jiffy krusteaz pillsbury stove-top hamburger-helper rice-a-roni kraft annie's " +
  "ramen cup-noodles maruchan top-ramen nissin samyang shin " +
  "masa masa-harina maseca harina pao tapioca-pearls boba sago sabudana poha beaten-rice rava suji sooji besan gram atta maida " +
  "jaggery gur piloncillo panela rapadura muscovado sucanat demerara turbinado coconut-sugar date-sugar maple-sugar " +
  "dulce-de-leche cajeta condensed-milk evaporated-milk milk-powder malted-milk malt-powder ovaltine " +
  "liquid-smoke kitchen-bouquet gravy-master browning accent msg nutritional-yeast nooch bragg aminos coconut-aminos " +
  "vegemite marmite bovril maggi knorr goya sazon adobo-seasoning lawry's old-bay tony-chachere's slap-ya-mama mrs-dash " +
  "everything-bagel-seasoning lemon-pepper garlic-salt onion-salt celery-salt seasoned-salt season-all";

/**
 * MODIFIERS: forms, preparations, colours, sizes, qualities, varieties, origins and cuisines that may stand before a
 * food in its name ("boneless skinless", "extra-virgin", "Granny Smith", "heirloom", "free-range", "Italian").
 */
const MODIFIERS =
  "fresh frozen dried dry canned tinned jarred bottled boxed bagged packaged prepared ready-made homemade home-made store-bought storebought " +
  "cooked uncooked raw precooked pre-cooked parboiled leftover day-old stale ripe unripe overripe green firm soft hard crisp crispy crunchy " +
  "tender lean extra-lean fatty marbled boneless bone-in skinless skin-on deboned deveined peeled unpeeled shelled unshelled pitted stoned " +
  "seedless seeded hulled husked trimmed untrimmed cleaned dressed whole half halved quartered sliced diced chopped minced grated shredded " +
  "crushed ground cracked cubed julienned spiralized riced mashed pureed puréed creamed whipped beaten melted softened clarified browned " +
  "toasted roasted fire-roasted grilled broiled baked fried deep-fried pan-fried sauteed sautéed steamed boiled poached braised stewed " +
  "smoked cured salted unsalted brined pickled marinated seasoned spiced unseasoned plain flavored flavoured sweet sweetened unsweetened " +
  "semisweet semi-sweet bittersweet dark milk white light lite reduced-fat low-fat lowfat nonfat non-fat fat-free full-fat whole skim " +
  "low-sodium reduced-sodium no-salt-added sodium-free sugar-free no-sugar-added gluten-free dairy-free vegan vegetarian organic natural " +
  "kosher halal free-range cage-free pasture-raised grass-fed grain-fed wild wild-caught farm-raised farmed fresh-caught sustainable " +
  "heirloom hothouse greenhouse vine-ripened local seasonal baby young mature aged sharp mild medium hot extra extra-sharp extra-virgin " +
  "virgin pure refined unrefined cold-pressed expeller-pressed raw unfiltered filtered instant quick quick-cooking old-fashioned rolled " +
  "steel-cut stone-ground self-rising self-raising all-purpose plain strong unbleached bleached enriched fortified microwave kettle " +
  "kettle-cooked deep dish deep-dish thin-crust stuffed-crust hand-tossed oven-ready no-boil quick-cook microwavable spray " +
  "large small medium jumbo extra-large colossal giant mini miniature bite-size bite-sized petite thick thin thick-cut thin-sliced " +
  "center-cut french-cut long short round flat curly flat-leaf italian thai mexican chinese japanese korean indian greek spanish french " +
  "german polish russian swiss dutch english irish scottish american southern cajun creole caribbean jamaican cuban brazilian peruvian " +
  "argentinian moroccan turkish lebanese persian israeli middle eastern asian vietnamese filipino hawaiian tex-mex " +
  "red yellow green orange purple black white brown golden pink blue gold silver rainbow multicolored multi-colored mixed assorted " +
  "regular classic original traditional premium choice prime select fancy grade jumbo lump backfin claw colossal " +
  "creamy chunky smooth crunchy natural salted roasted honey-roasted dry-roasted spicy sweet-and-sour tangy savory savoury zesty " +
  "garlic herb lemon pepper cajun ranch barbecue bbq teriyaki buffalo honey maple brown-sugar cinnamon vanilla chocolate strawberry " +
  "double triple single heavy whipping light thickened clotted sour cultured fermented sprouted puffed popped pressed glazed candied " +
  "crystallized dehydrated freeze-dried evaporated condensed powdered granulated superfine caster castor confectioners confectioners' " +
  "icing turbinado demerara muscovado coarse fine kosher flaky sea table iodized rock pink himalayan celtic smoked black white " +
  "cracked whole ground pure imitation artificial real fresh-squeezed freshly squeezed hand-picked day frozen thawed defrosted " +
  "refrigerated chilled cold warm hot room-temperature stuffed filled topped coated breaded battered crumbed glazed frosted iced " +
  "rotisserie deli store bakery fresh-baked homestyle home-style country-style country farmhouse rustic artisan artisanal sourdough " +
  "wholegrain whole-grain whole-wheat multigrain multi-grain seven-grain twelve-grain sprouted-grain gluten keto paleo low-carb " +
  "family-size family-sized snack-size fun-size king-size individual single-serve mini bite-size jumbo party-size cocktail " +
  "dinner lunch breakfast dessert appetizer side main sandwich salad soup stew stir-fry stirfry frying roasting baking cooking eating " +
  "pickling slicing stewing boiling grilling drinking dipping spreading whipping sipping hard-boiled soft-boiled hard-cooked " +
  "sunny-side scrambled over-easy deviled devilled cut active instant rapid-rise fast-acting quick-rise vitamin enhanced fortified " +
  "diet zero caffeine-free decaf decaffeinated low-calorie light sparkling still flavored infused";

/**
 * Words that are food heads only together with the food word before them ("tea bags", "chicken pot pie" is covered by the
 * classes): compound food names whose last word is not a food by itself.
 */
const COMPOUND_FOODS = [
  "tea bag", "coffee pod", "ice cube", "buddha's hand", "corn husk", "banana leaf", "grape leaf", "vine leaf", "lemon wheel", "lime wheel", "orange wheel",
  // bowls and cups made of food, or holding a dish
  // (bowls MADE of food only: "1 burrito bowl", "1 rice bowl" name a dish served in a bowl, and a person checks them)
  "bread bowl", "tortilla bowl", "wonton cup", "phyllo cup", "filo cup", "lettuce cup", "peanut butter cup", "fruit cup", "pudding cup", "jello cup", "yogurt cup",
  "reese's cup", "reeses cup", "cookie cup", "pastry cup", "tart cup", "cheesecake cup", "dessert cup", "cup noodle", "noodle cup",
  // sheets and wrappers made of food
  "gummy bear", "gummi bear", "gummy worm", "candy cane", "candy bar", "chocolate bar", "granola bar", "protein bar", "energy bar", "rice paper", "wonton wrapper", "egg roll wrapper", "spring roll wrapper", "dumpling wrapper", "gyoza wrapper", "potsticker wrapper",
  "lasagna sheet", "phyllo sheet", "filo sheet", "pastry sheet", "nori sheet", "seaweed sheet", "rice paper wrapper", "edible paper", "wafer paper",
  // pots and pans in dish names
  "pot pie", "pot roast", "pot sticker", "pan dulce", "pan roast", "pan pizza", "sheet cake", "sheet pan dinner",
  // dishes and cuts named with an equipment or measure word ("1 lb short plate", "4 Italian grinders", "1 jello mold")
  "short plate", "italian grinder", "jello mold", "jell-o mold", "gelatin mold", "charcuterie board", "grazing board", "fruit basket",
  "mason jar salad", "cheese wheel", "juice box", "spoon bread", "spoonbread", "bird's nest", "corn on the cob", "ice cream cone",
  "jelly roll", "swiss roll", "cake pop", "muffin top", "stick pretzel", "kettle corn", "tin roof sundae",
  // a product named like a tool, in the plural only ("1 carton Egg Beaters"; "1 egg beater" is the tool)
  "egg beaters", "london broil", "freezer pop",
  // foods whose last word is also an equipment head (ring, rack, ball, cup, stick, boat, peel, tip, straw, mixer): compound names only
  "onion ring", "pineapple ring", "kielbasa ring", "sausage ring", "bologna ring", "shrimp ring", "apple ring", "pepper ring", "calamari ring", "squid ring", "jalapeno ring", "banana pepper ring",
  "cinnamon stick", "celery stick", "carrot stick", "cucumber stick", "cheese stick", "pretzel stick", "bread stick", "fish stick", "crab stick",
  "mozzarella stick", "veggie stick", "vegetable stick", "jicama stick", "apple stick", "chicken stick", "licorice stick", "rock candy stick",
  "rice ball", "cheese ball", "melon ball", "energy ball", "matzo ball", "matzah ball", "cake ball", "dough ball", "protein ball", "popcorn ball",
  "bliss ball", "rum ball", "bourbon ball", "date ball", "coconut ball", "malt ball", "pizza dough ball", "mochi ball", "sesame ball", "fish ball",
  "falafel ball", "risotto ball", "arancini ball", "crab ball", "shrimp ball", "pork ball", "beef ball", "chicken ball", "turkey ball", "sausage ball",
  "cookie dough ball", "truffle ball", "oat ball", "peanut butter ball", "chocolate ball", "tapioca ball", "boba ball", "glutinous rice ball", "lamb ball",
  "applesauce cup", "pudding cup", "jello cup", "jell-o cup", "yogurt cup", "fruit cup", "mousse cup", "trifle cup", "parfait cup", "ramen cup",
  "banana boat", "zucchini boat", "potato boat", "bread boat", "orange peel", "lemon peel", "lime peel", "citrus peel", "candied peel",
  "grapefruit peel", "mixed peel", "asparagus tip", "sirloin tip", "steak tip", "wing tip", "cheese straw", "potato straw", "pastry straw",
  "lamb rack", "pork rack", "veal rack", "venison rack", "rib rack", "cocktail mixer", "margarita mixer", "drink mixer", "bloody mary mixer", "mary mixer",
  "daiquiri mixer", "mojito mixer", "sour mixer", "colada mixer", "mule mixer", "cosmopolitan mixer", "mimosa mixer", "sangria mixer",
  // dishes named with a vessel or measure word (round 3): the vessel word is a measure after a count otherwise ("1 pot chili")
  "string bean", "string cheese", "string hopper", "flat iron steak", "flat bread", "flat bean", "side salad", "side dish", "side bacon",
  "side pork", "layer cake", "layer bar", "cactus paddle", "nopal paddle", "mug cake", "pan bagnat", "pan con tomate", "pan de muerto", "pan de sal", "hand pie", "hand roll", "bouquet garni", "spritz cookie",
  "jell-o shot", "jello shot", "jelly shot", "pudding shot", "wood ear", "plate rib", "funnel cake", "kettle chip",
  // assortments sold or served on a tray or platter ("1 veggie tray", "1 deli platter")
  // (semantic-v3, FL-C8) cuts, fish, cups and cases named with a word that is otherwise a measure or a vessel
  // dishes served as a bowl ("1 grain bowl"; "1 burrito bowl" stays for a person, see above)
  "buddha bowl", "poke bowl", "acai bowl", "smoothie bowl", "power bowl", "harvest bowl",
  "sand dab", "crumb cake", "crumb bar", "coffee cake", "pound cake", "sponge cake", "layer cake", "grain bowl", "brisket point", "brisket flat", "hot pot", "brick pastry", "chocolate cup", "meringue cup", "waffle cup", "wafer cup", "tuile cup",
  "pastry case", "tart case", "tartlet case", "vol-au-vent case", "filo case", "phyllo case", "pie case",
  "veggie tray", "vegetable tray", "fruit tray", "cheese tray", "meat tray", "deli tray", "relish tray", "shrimp tray", "deli platter",
  "fruit platter", "cheese platter", "meat platter", "seafood platter", "sushi platter", "party platter", "antipasto platter",
];

// --- semantic-v3 vocabulary (Phase 2C, FL-C8): word classes extended to reduce review of valid foods -----------------
//
// Each constant is a word CLASS of general cookery and grocery vocabulary. The classes were extended because review R4
// found valid foods of these classes sent to a person (PHASE-2C-PLAN FL-C8); the entries are written from the class,
// not only from the reviewed lines, and every one of them is exposed development material. None of these words can make
// a non-food line ready by itself: a head must still be a food and the measure slot is still accounted for (§13.2).

/** Produce of less common or regional kinds: roots and tubers, gourds and squashes, greens, pickled fruits. */
const V3_PRODUCE =
  "eddo eddoe eddoes dasheen malanga yautia tannia tania boniato boniatos batata ñame name-root cush-cush oca ulluco mashua arracacha " +
  "silverbeet silver-beet perpetual-spinach chard-stems kohlrabi-greens mizuna komatsuna tatsoi yu-choy gai-choy amaranth-greens callaloo " +
  "caperberry caperberries kuri red-kuri honeynut ambercup butterkin jarrahdale tromboncino cousa tatume cucuzza gem-squash sunburst " +
  "winter-melon wax-gourd ash-gourd fuzzy-melon bitter-melon bitter-gourd snake-gourd ridge-gourd ivy-gourd chayote-squash";
/** Meat cuts named as heads (a cut is bought as itself). */
const V3_CUTS =
  "backstrap backstraps eye-fillet scotch-fillet point-end flat-end deckle spinalis cap-steak zabuton bavette-steak oyster-blade " +
  "featherblade flat-iron petite-tender chuck-tender ranch-steak skirt flank tomahawk tomahawks cowboy-steak";
/** Breads, pastries, dumplings and buns of regional cuisines (counted as written; many have invariant plurals). */
const V3_BAKED =
  "fatayer sfiha sfeeha sambousek sambusa samsa siopao siomai hopia ensaymada pandesal pan-de-sal bolani gozleme pide kubaneh malawach " +
  "spanakopita tiropita kolach kolache kolaches pirozhki piroshki pirog chebureki belyashi khinkali manti mandu jiaozi baozi bao gyoza " +
  "tartlet tartlets vol-au-vent vol-au-vents brick-pastry warka yufka kataifi feuilles-de-brick " +
  // frostings and icings by kind
  "buttercream buttercreams ermine-frosting royal-icing glace-icing seven-minute-frosting swiss-meringue-buttercream cream-cheese-frosting";
/** Products sold as blends and bases. */
const V3_PANTRY = "blend blends soup-base hot-pot-base hot-pot";
/** Taste and season adjectives that describe a food ("bitter melons", "winter melon", "summer squash"). */
const V3_TASTE_SEASON = "bitter sour tart tangy winter summer autumn spring-time early-season late-season";
/**
 * Degree and sourcing adverbs before a modifier ("extremely ripe", "locally grown", "organically raised", "sustainably
 * caught", "freshly picked").
 */
const V3_ADVERBS =
  "extremely exceptionally especially fully partly partially somewhat overly locally organically sustainably ethically responsibly humanely " +
  "naturally traditionally carefully thinly thickly finely coarsely roughly lightly heavily generously barely";
/** Where a food is bought or produced, used before it ("supermarket rotisserie chickens", "farm eggs", "garden tomatoes"). */
const V3_SOURCES = "supermarket grocery grocery-store store deli bakery market farmers-market farm farmstand garden backyard orchard butcher fishmonger dairy-farm";
/** Rearing and feeding of an animal ("suckling pig", "milk-fed veal", "corn-fed chicken"). */
const V3_REARING = "suckling milk-fed corn-fed acorn-fed grain-finished grass-finished heritage-breed heritage";
/** Shape and cut styles of breads, potatoes and steaks ("cloverleaf rolls", "accordion potatoes", "cowboy steaks"). */
const V3_SHAPES = "cloverleaf accordion hasselback fan crescent rosette braided twisted knotted spiral-cut cowboy tomahawk butterfly jacket";
const SHAPE_STYLE_WORDS: ReadonlySet<string> = setOf(V3_SHAPES);
/** Cooking techniques used as modifiers ("sous-vide egg bites", "en papillote"). */
const V3_TECHNIQUES = "sous-vide sous vide flambe flambeed confit tandoori teppanyaki rotisserie-style overnight same-day next-day night-before";
/** Place names used in food names ("California rolls", "Philly cheesesteak", "Kansas City ribs", "Maryland crab cakes"). */
const V3_PLACES =
  "california philly philadelphia texas kansas maryland carolina georgia florida louisiana maine idaho vermont wisconsin buffalo boston chicago " +
  "detroit nashville memphis new york manhattan brooklyn jersey cincinnati hawaii hawaiian alaska alaskan sonoma napa vidalia walla";
/** Variety and style names of products ("Jonah crab", "Parker House rolls"). */
const V3_VARIETIES = "jonah peekytoe parker house kaiser hoagie brioche potato-bun martin's";
/**
 * Grocery brand names of packaged foods ("Kind bars", "Babybel cheeses", "Beyond burgers", "Nilla wafers"): with a bare count a
 * capitalised word is a brand only when it is in this class (CONTRACT §13.2: a word the lexicons do not know is unrecognised).
 */
const V3_BRANDS =
  "kind clif larabar rxbar quest nature-valley kashi babybel boursin laughing-cow philadelphia kraft velveeta tillamook cabot sargento " +
  "beyond impossible gardein morningstar boca quorn nilla oreo ritz triscuit wheat-thins chips-ahoy keebler pepperidge goldfish cheez-it " +
  "heinz hellmann's hellmanns kewpie frank's tabasco cholula rao's barilla de-cecco bertolli ragu prego hunt's muir del-monte dole " +
  "jif skippy smucker's nutella kerrygold land-o-lakes challenge horizon chobani fage siggi's oikos yoplait dannon activia " +
  "jimmy-dean oscar-mayer hillshire johnsonville boar's-head hormel spam swanson campbell's progresso knorr maggi lipton";

// --- Recognition ------------------------------------------------------------------------------------

/** Adjectives that only stand before a noun: after a food noun and before the head they mark a measure ("1 cake fresh yeast"). */
const PRE_NOUN_MODIFIERS = setOf(
  "fresh frozen dried dry raw cooked uncooked heavy light dark sweet hot whole ground chopped sliced diced minced grated shredded crushed smoked " +
    "roasted toasted salted unsalted large small medium extra mini jumbo thick thin ripe soft firm hard boneless skinless lean plain fine coarse",
);

const FOOD_CLASSES = [
  FRUITS, VEGETABLES, MUSHROOMS, HERBS, SPICES, CONDIMENTS, MEATS, SEAFOOD, DAIRY, BAKED, DISHES, SWEETS, DRINKS, NUTS_GRAINS, PANTRY, MORE_FOODS, EXTRA_FOODS,
  V3_PRODUCE, V3_CUTS, V3_BAKED, V3_PANTRY,
  FRUITS_MORE, VEGETABLES_MORE, MUSHROOMS_MORE, HERBS_MORE, SPICES_MORE, CONDIMENTS_MORE, MEATS_MORE, SEAFOOD_MORE, DAIRY_MORE, BAKED_MORE,
  DISHES_MORE, SWEETS_MORE, DRINKS_MORE, NUTS_GRAINS_MORE, PANTRY_MORE,
];
const FOOD_WORDS: ReadonlySet<string> = setOf(...FOOD_CLASSES);
const NAME_PART_WORDS: ReadonlySet<string> = setOf(FOOD_NAME_PARTS);
const MODIFIER_WORDS: ReadonlySet<string> = setOf(MODIFIERS, VARIETIES, MORE_MODIFIERS, V3_TASTE_SEASON, V3_ADVERBS, V3_SOURCES, V3_REARING, V3_TECHNIQUES, V3_PLACES, V3_VARIETIES, V3_BRANDS);

/**
 * A hyphenated food of two or three parts is also a compound food name when written with spaces ("hearts-of-palm",
 * "pineapple-tidbits", "chips-ahoy"), with the singular of its last word ("pineapple tidbit").
 */
function hyphenCompounds(): string[] {
  const out: string[] = [];
  for (const w of FOOD_CLASSES.flatMap(words)) {
    const parts = w.split("-").filter((p) => p.length > 0);
    if (!w.includes("-") || parts.length < 2 || parts.length > 3) continue;
    // a food first ("pineapple-tidbits", "hearts-of-palm"), not an adjective ("fresh-yeast" stays a written compound)
    if (!FOOD_WORDS.has(parts[0]) || PRE_NOUN_MODIFIERS.has(parts[0])) continue;
    for (const last of forms(parts[parts.length - 1])) out.push([...parts.slice(0, -1), last].join(" "));
  }
  return out;
}
const COMPOUND_FOOD_SET: ReadonlySet<string> = new Set([...COMPOUND_FOODS, ...hyphenCompounds()]);

/** Joining words that may stand inside a food name ("leg of lamb", "cream of mushroom soup", "tuna in olive oil", "pot au feu"). */
const NAME_JOINERS = setOf("of and & in with w/ or on the au aux a al alla all' de del della di du la le en con y e n' 'n' style");

/** "pot" + "pie", "cup" + "noodles": two words that make a compound food name (COMPOUND_FOODS). */
export function compoundFood(w1: string, w2: string): boolean {
  return forms(plainWord(w2)).some((f) => COMPOUND_FOOD_SET.has(`${plainWord(w1)} ${f}`));
}

/**
 * (semantic-v3) Two words that make a food name: a compound food (COMPOUND_FOODS), or a hyphenated food of the lexicons
 * written with a space ("glass noodles" = "glass-noodles", "pot cheese" = "pot-cheese", "stone crab" = "stone-crab").
 */
export function twoWordFood(w1: string, w2: string): boolean {
  const a = plainWord(w1);
  return compoundFood(w1, w2) || forms(plainWord(w2)).some((f) => FOOD_WORDS.has(`${a}-${f}`) || FOOD_WORDS.has(`${a}-${plainWord(w2)}`));
}

/** (semantic-v3) The words, all of them, are a compound food name ("sheet pan dinner", "pot roast"). */
export function compoundFoodExactly(ws: readonly string[]): boolean {
  if (ws.length < 2) return false;
  const lower = ws.map(plainWord);
  return forms(lower[lower.length - 1]).some((f) => COMPOUND_FOOD_SET.has([...lower.slice(0, -1), f].join(" ")));
}

/** The words end in a compound food name of two or three words ("peanut butter cups", "wonton cups", "tea bags"). */
export function compoundFoodEnding(ws: readonly string[]): boolean {
  if (ws.length < 2) return false;
  const lower = ws.map(plainWord);
  const lastForms = forms(lower[lower.length - 1]);
  for (let k = Math.max(0, lower.length - 3); k < lower.length - 1; k++) {
    if (lastForms.some((f) => COMPOUND_FOOD_SET.has([...lower.slice(k, -1), f].join(" ")))) return true;
  }
  return false;
}

/** A cultivar, style or variety word (VARIETIES: "butter", "iceberg", "Yukon", "Fuji", "kalamata", "basmati"). */
export function varietyWord(word: string): boolean {
  return VARIETY_WORDS.has(plainWord(word));
}
const VARIETY_WORDS: ReadonlySet<string> = setOf(VARIETIES);

/** Lower case without diacritics ("jalapeño" → "jalapeno", "crème" → "creme"). */
export function plainWord(w: string): string {
  return w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’]/g, "'");
}

/** The word and its singular candidates ("cherries" → cherry, "loaves" → loaf/loave, "tomatoes" → tomato, "radishes" → radish). */
function forms(w: string): string[] {
  const out = [w];
  if (w.endsWith("ies") && w.length > 4) out.push(`${w.slice(0, -3)}y`);
  if (w.endsWith("ves") && w.length > 4) out.push(`${w.slice(0, -3)}f`, `${w.slice(0, -3)}fe`);
  if (w.endsWith("es") && w.length > 3) out.push(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 2) out.push(w.slice(0, -1));
  if (w.endsWith("'s")) out.push(w.slice(0, -2));
  return out;
}

const inSet = (set: ReadonlySet<string>, w: string) => forms(w).some((f) => set.has(f));

/** A food noun (any class, any regular plural; a hyphenated word whose parts are foods or modifiers with a food last). */
export function foodWord(word: string): boolean {
  const w = plainWord(word);
  if (inSet(FOOD_WORDS, w)) return true;
  if (w.includes("-")) {
    const parts = w.split("-").filter((p) => p.length > 0);
    return parts.length >= 2 && inSet(FOOD_WORDS, parts[parts.length - 1]) && parts.slice(0, -1).every((p) => inSet(FOOD_WORDS, p) || MODIFIER_WORDS.has(p) || NAME_PART_WORDS.has(p));
  }
  return false;
}

/** A word that may stand before the head of a food name: a food, a modifier, a name part, a number or a percentage. */
export function foodModifierWord(word: string): boolean {
  const w = plainWord(word);
  if (w.length === 0) return true;
  if (foodWord(w) || MODIFIER_WORDS.has(w) || inSet(NAME_PART_WORDS, w) || NAME_JOINERS.has(w)) return true;
  if (/^\d+(?:[.,/]\d+)?%?$/.test(w) || /^\d+%$/.test(w)) return true; // "2%", "80/20", "7"
  if (/^(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve)$/.test(w)) return true; // "three cheese", "five-spice"
  if (w.includes("-")) {
    const parts = w.split("-").filter((p) => p.length > 0);
    // a number with a time, size or unit word ("5-minute rice", "2-minute noodles", "10-inch tortillas", "16-ounce steak")
    if (parts.length === 2 && /^\d+(?:[.,/]\d+)?$/.test(parts[0]) && (HYPHEN_MEASURE_WORDS.has(parts[1]) || unitOfWord(parts[1]) !== null)) return true;
    // a product phrase of kitchen verbs ("slice-and-bake", "heat-and-serve", "peel-and-eat", "pinch-pleated", "no-bake")
    return parts.every((p) => foodModifierWord(p) || PHRASE_VERBS.has(p) || KITCHEN_ACTION_VERBS.has(p));
  }
  // past participles describe a food ("hand-pulled", "slow-roasted", "glazed"); "-ing" words only from the lexicons
  // (culinary-purpose words: "baking", "frying", "smoking"): any other "-ing" noun may be a measure ("1 helping mashed
  // potatoes", "1 light sprinkling cheese": `measureGerund`)
  // (semantic-v3, R1 §5 path 3) only the participle of a known verb ("2 glorped apples" is not read): `knownParticiple`
  return knownParticiple(w);
}

/**
 * PARTICIPLE VERBS (semantic-v3): verbs of growing, sourcing, preparing, cooking, preserving and packing food, whose past
 * participles describe a food before its head ("farm-raised", "hand-picked", "barrel-aged", "pan-seared", "blistered",
 * "caramelized"). A general class of English verbs; with KITCHEN_ACTION_VERBS and PHRASE_VERBS it decides which "-ed" words
 * are modifiers — an "-ed" word of no known verb is an unrecognised word (§13.2), never a modifier by its ending alone.
 */
const PARTICIPLE_VERBS = setOf(
  "age bake barbecue baste batter blacken blanch blister boil bone braise bread brine broil brown butter butterfly candy caramelize caramelise " +
    "char chill chip clarify coat color colour condense cool core crack cream crisp crumb crumble crust cube cure debone deglaze dehydrate " +
    "devein dice distil distill dress drizzle dry dust enrich ferment fillet flake flavor flavour flash-freeze fold fortify frost fry garnish " +
    "glaze grate grill grind halve harvest heat hull husk ice infuse jar juice julienne knead layer leaven malt marble marinate mash melt " +
    "mince mix mold mould oak oil pack package parboil pasteurize pasteurise peel pepper pickle pit plank pluck poach pop powder precook " +
    "preserve press puff pull puree quarter raise refine render rinse ripen roast roll rub salt sauce saute scald scramble sear " +
    "season seed shell shred shuck sift skin slice smoke soak soften spice spiral sprout steam stew stone stuff sugar sweeten swirl " +
    "tenderize tenderise thicken toast top trim truss unwrap vacuum whip whisk wrap zest can bottle box bag tin chop farm pasture source " +
    "import cultivate store pick catch hand-pick hand-cut hand-roll stretch twist braid shape fill frost decorate sprinkle spike lace " +
    "brew steep grain finish wash rind bloom spray blend squeeze crush cut segment slice score pound flatten tie net cook smash wax pleat " +
    "glue fold pinch stamp mark label portion weigh grade sort select clean scrub",
);
/** Irregular past participles of the same verbs ("grown", "frozen", "beaten", "ground", "fed", "bred", "caught", "set"). */
const IRREGULAR_PARTICIPLES = setOf("processed grown frozen risen beaten broken chosen eaten hidden proven shaken stolen swollen taken thrown woken bitten blown drawn known sewn shown sown spun torn worn ground bound found wound fed bred caught bought brought made kept left dried fried set cut split shed spread lit");

/** The past participle of a known verb (PARTICIPLE_VERBS, KITCHEN_ACTION_VERBS, PHRASE_VERBS, or an irregular one). */
export function knownParticiple(word: string): boolean {
  const w = plainWord(word);
  if (IRREGULAR_PARTICIPLES.has(w)) return true;
  if (!/^\p{L}{3,}ed$/u.test(w)) return false;
  // ("unbaked", "unwaxed", "unpeeled": the negative of a known participle)
  if (/^(?:un|non-?|pre-?|re|over|under|half-?|double-?|twice-?)\p{L}{3,}ed$/u.test(w) && knownParticiple(w.replace(/^(?:un|non-?|pre-?|re|over|under|half-?|double-?|twice-?)/u, ""))) return true;
  const verb = (v: string) => v.length >= 2 && (PARTICIPLE_VERBS.has(v) || KITCHEN_ACTION_VERBS.has(v) || PHRASE_VERBS.has(v));
  const base = w.slice(0, -2);
  const doubled = base.length >= 3 && base[base.length - 1] === base[base.length - 2] ? base.slice(0, -1) : "";
  const y = w.endsWith("ied") ? `${w.slice(0, -3)}y` : "";
  return verb(base) || verb(w.slice(0, -1)) || verb(doubled) || verb(y);
}

/** Time and size words after a number in a hyphenated modifier ("5-minute", "90-second", "10-inch", "3-layer"). */
const HYPHEN_MEASURE_WORDS = setOf(
  "minute minutes min second seconds sec hour hours hr day days week weeks month months year years inch inches in cm mm foot ft layer " +
    "layers ingredient ingredients piece pieces pc count ct pack serving servings serve portion portions bone grain bean cheese spice herb " +
    "pepper star egg",
);
/** Verbs and particles of product phrases ("slice-and-bake", "heat-and-serve", "boil-in-bag", "make-ahead", "pull-apart"). */
const PHRASE_VERBS = setOf("bake eat serve cook heat peel pull take make boil fry roast broil grill dip go ready no ahead apart in bag it own pinch");

/** A word that only describes a food (a modifier, variety, style or colour word; not a food or part noun). */
export function describingWord(word: string): boolean {
  const w = plainWord(word);
  return MODIFIER_WORDS.has(w) || COLOUR_WORDS.has(w);
}

/**
 * MEASURE GERUND (semantic-v2 round 3, R1 item 1): an "-ing" noun that names an amount, not a kind of food — "helping",
 * "dusting", "sprinkling", "smattering", "slathering", "drizzling", "dousing" (and their plurals). Culinary-purpose
 * modifiers ("baking", "frying", "roasting", "pickling", "eating", "dipping", "drinking", "whipping") and food nouns
 * ("pudding", "dumpling", "stuffing", "icing", "herring", "spring") are not measures.
 */
export function measureGerund(word: string): boolean {
  const w = plainWord(word);
  if (!/^\p{L}{3,}ings?$/u.test(w)) return false;
  return !foodWord(w) && !MODIFIER_WORDS.has(w) && !inSet(NAME_PART_WORDS, w);
}

/**
 * A tool or appliance noun (not a vessel that can hold an amount) used before a food head says how the food is made or
 * served: "griddle cakes", "toaster waffles", "toaster pastries", "funnel cakes", "boiler onions", "oven fries". Only
 * before a food head itself (not a portion head), and never in the measure position of a line (amount.ts reads those).
 */
function toolModifier(w: string): boolean {
  if (VESSEL_LIKE.has(w) || EQUIPMENT_VESSEL_HEADS[w] !== undefined) return false;
  if (EQUIPMENT_TOOL_HEADS.has(w)) return true;
  const m = /^(\p{L}{2,}?)(?:er|or)$/u.exec(w);
  if (m === null) return false;
  const stem = m[1];
  const doubled = stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2] ? stem.slice(0, -1) : "";
  return [stem, `${stem}e`, doubled].some((c) => c.length > 0 && (KITCHEN_ACTION_VERBS.has(c) || PHRASE_VERBS.has(c)));
}
/** Tools that hold or measure an amount: never a modifier ("1 shaker salt", "1 pot chili", "1 dish baked ziti"). */
const VESSEL_LIKE = setOf(
  "oven ovens pot pots pan pans kettle kettles dish dishes plate plates platter platters tray trays board boards ramekin ramekins mold molds mould " +
    "moulds shaker shakers grinder grinders mill mills spoon spoons ladle ladles scoop scoops measure cup cups bowl bowls mug mugs glass " +
    "glasses jar jars jug jugs pitcher pitchers tin tins can cans box boxes bag bags bottle bottles basket baskets bucket buckets press presses",
);

/** Portions and parts that are a name's head only after a food ("chicken pieces", "pineapple tidbits", "burnt ends"). */
const PORTION_HEADS = setOf(
  "piece chunk bit tidbit morsel slice slab cube dice crumble crumb shaving shred strip sliver coin disc disk plank portion medallion " +
    "segment wedge half halves quarter spear floret nugget bite end back frame flat neck shell grounds trimming scrap skin rib bottom " +
    "top nest finger",
  // (ring, rack, ball, cup, stick, boat, peel, tip and straw are also equipment heads: foods with them are compound names)
);
const COLOUR_WORDS = setOf("red yellow green orange purple black white brown golden pink blue");

/**
 * RECOGNISED FOOD HEAD (semantic-v2, PHASE-2B-PLAN §6.1): the name's head — its last word, or a compound food name
 * (COMPOUND_FOODS) — is a recognised food, and every word before it is a recognised modifier, food or name-part word, a
 * joining word between them, or a capitalised proper name or brand ("Granny Smith", "Kraft", "San Marzano"). A food noun
 * followed by a pre-noun adjective before the head is a measure, not a name ("cake fresh yeast", "swirl heavy cream").
 * "chicken thighs", "baby back ribs", "Granny Smith apples", "leg of lamb", "three cheese pizzas" are recognised; "comal",
 * "dough hook", "tot dark rum", "cocktail umbrellas" are not.
 */
export function recognisedFoodHead(name: string, ctx: FoodNameContext = OPEN_CONTEXT): boolean {
  return foodNameReading(name, true, ctx);
}

/**
 * (semantic-v3) Where the name stands on its line (CONTRACT §13.2):
 *  - `slotResolved`: a declared unit word stands before the name ("1 jar …", "2 sticks …"), so no word of the name is
 *    in the measure slot; a capitalised proper name or brand is then accepted before a food head ("1 can Campbell's
 *    soup", "1 envelope Lipton onion soup mix"). With a bare count it is not: a capitalised word the lexicons do not
 *    know is an unrecognised word ("2 Zorble apples", "1 Le Creuset tagine"), unless the whole line is in Title Case.
 *  - `countAgrees`: a count above one before a plural food head ("6 pan rolls", "4 griddle cakes", "6 tin-roof
 *    brownies"): the count counts the food, so a tool word or a hyphenated compound before the head describes it.
 */
export interface FoodNameContext {
  slotResolved: boolean;
  countAgrees: boolean;
}
const OPEN_CONTEXT: FoodNameContext = { slotResolved: false, countAgrees: false };

/**
 * As `recognisedFoodHead`, but the head must itself be a food or a compound food name — a portion head after a food
 * ("popsicle sticks", "tart ring") is not enough. A sure equipment shape yields only to such a name (`equipmentPhrase`).
 */
export function recognisedFoodNoun(name: string): boolean {
  return foodNameReading(name, false, OPEN_CONTEXT);
}

function foodNameReading(name: string, portions: boolean, ctx: FoodNameContext): boolean {
  let raw = name.trim().split(/[\s,]+/).map((w) => w.replace(/^[("'“‘]+|[)"'”’.:;!?]+$/g, "")).filter((w) => w.length > 0);
  if (raw.length === 0) return false;
  // a food "of" a named place: the food is the head ("prosciutto di Parma", "lentils du Puy", "jamón de Teruel")
  const origin = raw.findIndex((w, k) => k > 0 && ORIGIN_JOINERS.has(plainWord(w)) && raw.slice(k + 1).length > 0 && raw.slice(k + 1).every((x) => /^\p{Lu}/u.test(x)));
  if (origin > 0 && !foodWord(raw[raw.length - 1])) raw = raw.slice(0, origin);
  // (semantic-v3) a dish name in a Romance language is head-first ("pots de crème", "pan de bono", "eggs en cocotte",
  // "pot au feu"): it is a food when the words before the joiner name one, when its first word is a Romance food noun, or
  // when a food is named after the joiner
  const romance = raw.findIndex((w, k) => k > 0 && k < raw.length - 1 && ROMANCE_JOINERS.has(plainWord(w)));
  if (romance > 0 && origin < 0) {
    const before = raw.slice(0, romance);
    const after = raw.slice(romance + 1).map(plainWord);
    if (foodNameReading(before.join(" "), portions, ctx)) return true;
    if (before.length === 1 && ROMANCE_FOOD_HEADS.has(plainWord(before[0]))) return true;
    return before.every((w) => foodModifierWord(w) || VESSEL_LIKE.has(plainWord(w)) || ROMANCE_FOOD_HEADS.has(plainWord(w))) && after.some((w) => foodWord(w));
  }
  const lower = raw.map(plainWord);
  // a compound food at the end ("tea bags", "banana leaves", "wonton cups")
  let head = raw.length - 1;
  const lastForms = forms(lower[lower.length - 1]);
  for (let k = Math.max(0, raw.length - 3); k < raw.length - 1 && head === raw.length - 1; k++) {
    if (lastForms.some((f) => COMPOUND_FOOD_SET.has([...lower.slice(k, -1), f].join(" ")))) head = k;
  }
  // a portion or part of a food named before it ("pineapple tidbits", "pork belly slab", "oysters on the half shell")
  if (head === raw.length - 1 && !foodWord(raw[head]) && !(portions && (inSet(PORTION_HEADS, lower[head]) || PART_NOUNS.has(lower[head])) && lower.slice(0, head).some(foodWord))) return false;
  // (semantic-v3, CONTRACT §13.5) a part head ("pods", "threads", "chunks", "stems") is a food only as the part of a food
  // named right before it ("vanilla pods", "saffron threads", "pineapple chunks"); after a brand or a material it is not
  // ("1 bag Tide pods", "1 bag cherry wood chunks")
  if (head === raw.length - 1 && head > 0 && partHead(lower[head]) && !(foodModifierWord(raw[head - 1]) && (!EQUIPMENT_MATERIAL_WORDS.has(lower[head - 1]) || (head >= 2 && compoundFood(lower[head - 2], lower[head - 1]))))) return false;
  if (head === raw.length - 1 && head === 0 && partHead(lower[head]) && !foodWord(lower[head])) return false;
  // (semantic-v3, CONTRACT §13.5) an animal named as the head ("pig", "cow") is a food only after its own describing words
  // ("suckling pig", "whole hog"), never after another food ("1 salt pig"); an animal word before a head names a food only
  // for its meat, milk or body parts ("pig ears", "cow's milk", "ox cheek"), never a product named after it ("1 cow creamer")
  if (head === raw.length - 1 && ANIMAL_NOUNS.has(lower[head]) && lower.slice(0, head).some((w) => foodWord(w) && !MODIFIER_WORDS.has(w))) return false;
  if (lower.slice(0, head).some((w) => ANIMAL_NOUNS.has(w.replace(/'s$/, ""))) && !inSet(ANIMAL_PRODUCT_HEADS, lower[raw.length - 1])) return false;
  // the head is a food itself, not a portion of one ("griddle cakes" may take a tool word before it; "egg cup" may not)
  const foodHead = head < raw.length - 1 || foodWord(raw[head]);
  let brandOnly = false;
  for (let k = 0; k < head; k++) {
    const w = raw[k];
    // (a vessel word names how a plural food is made — "6 pan rolls", "4 mug brownies" — where the count agrees with the
    // food; after a count of one it is a measure, read before this: "1 pot chili")
    const vesselBeforePlural = foodHead && VESSEL_LIKE.has(lower[k]) && k === head - 1 && /[^s]s$/.test(lower[head]);
    // (a compound food inside the name: "pot roast sandwiches", "tea bag holder" aside — the head decides)
    const innerCompound = (k + 1 < raw.length && compoundFood(lower[k], lower[k + 1])) || (k > 0 && compoundFood(lower[k - 1], lower[k]));
    // (semantic-v3, R1 §5 path 4) a tool word is a modifier before a food head only where it is not in the measure slot: after
    // a declared unit, or with a count that agrees with a plural head; an appliance always ("1 icebox cake", "oven fries")
    const tool = foodHead && toolModifier(lower[k]) && (k > 0 || ctx.slotResolved || ctx.countAgrees || APPLIANCE_WORDS.has(lower[k]));
    // (semantic-v3, FL-C8) a hyphenated compound with a known part, where the measure slot is resolved, is an attributive
    // compound ("6 tin-roof brownies", "1 bottle cask-strength bourbon", "6 sous-vide egg bites")
    const hyphenCompound = lower[k].includes("-") && (ctx.slotResolved || ctx.countAgrees) && hyphenatedModifier(lower[k]);
    // (semantic-v3, CONTRACT §13.2) an appliance says how a food is made or kept ("icebox cake", "fridge pickles"); after a
    // declared unit the measure is resolved, so a vessel or measure noun before the food describes it ("1 jar barrel pickles")
    const appliance = foodHead && APPLIANCE_WORDS.has(lower[k]);
    // (cookware stays out: "1 sheet pan roasted potatoes" names a pan, not a style)
    const describedVessel = foodHead && ctx.slotResolved && UNKNOWN_MEASURES.has(lower[k]) && !VESSEL_LIKE.has(lower[k]) && !EQUIPMENT_TOOL_HEADS.has(lower[k]);
    // (semantic-v3, round 1) a shape-style NOUN ("cloverleaf", "accordion", "fan", "rosette") describes a food only where it
    // is not in the measure slot — after a unit, after another word, or with a count that agrees with a plural head
    const shapeStyle = foodHead && SHAPE_STYLE_WORDS.has(lower[k]) && (k > 0 || ctx.slotResolved || ctx.countAgrees);
    const known = foodModifierWord(w) || tool || vesselBeforePlural || innerCompound || hyphenCompound || appliance || describedVessel || shapeStyle;
    // (a capitalised word is a proper name or brand, unless it is a unit or measure word ("2 BUNCH black beans") or a
    // plural opening the name, which counts rather than names ("2 Sips dark rum"))
    // (semantic-v3, R1 §5 path 2) only after a declared unit: with a bare count an unknown capitalised word is unrecognised
    const brand = !known && ctx.slotResolved && /^\p{Lu}/u.test(w) && unitOfWord(w) === null && !UNKNOWN_MEASURES.has(lower[k]) && !(k === 0 && head > 0 && /\p{Ll}s$/u.test(w) && !/(?:'s|ss|us|is|as)$/.test(lower[k]));
    if (!known && !brand) return false;
    if (brand) brandOnly = true;
    // "cake fresh yeast", "swirl heavy cream": a food noun, then an adjective that only stands before a noun
    if (k + 1 < head && FOOD_WORDS.has(lower[k]) && !MODIFIER_WORDS.has(lower[k]) && !COLOUR_WORDS.has(lower[k]) && PRE_NOUN_MODIFIERS.has(lower[k + 1])) return false;
  }
  // a brand before a wrap is cling film or foil ("1 Glad wrap", "1 box Reynolds Wrap"): a person checks
  if (brandOnly && head === raw.length - 1 && BRANDED_EQUIPMENT_HEADS.has(lower[head])) return false;
  return true;
}

/**
 * ROMANCE FOOD HEADS (semantic-v3): nouns of French, Spanish, Italian and Portuguese that head dish names before a joiner
 * ("pan de …", "pain au …", "pommes de terre", "arroz con …", "huevos a …", "oeufs en …"): bread, potatoes, rice, eggs,
 * chicken, meat, soup, cake, tart. A general class.
 */
const ROMANCE_FOOD_HEADS = setOf("pan pain pane pao pão pommes pomme arroz riz riso huevos huevo oeufs oeuf uova pollo poulet frango carne viande sopa soupe zuppa gateau gâteau torta tarte tarta pasta");
/** (semantic-v3) Live-animal nouns that are not meat names (the meat is "pork", "beef", "mutton"): see `foodNameReading`. */
const ANIMAL_NOUNS = setOf("pig pigs hog hogs piglet piglets cow cows ox oxen bull bulls steer steers sheep ewe ewes sow sows");
/** What an animal noun may stand before: its milk and milk products, meat, fat and body parts. */
const ANIMAL_PRODUCT_HEADS = setOf(
  "milk cheese butter cream yogurt yoghurt kefir curd ghee fat lard meat ear ears foot feet trotter trotters cheek cheeks tongue tongues tail tails " +
    "heart hearts liver livers kidney kidneys belly bellies skin blood bone bones hock hocks knuckle knuckles head heads brain brains tripe caul",
);
/** (semantic-v3) A part head (CONTRACT §13.2 PART_NOUNS, the portion heads, and pods and chunks). */
function partHead(w: string): boolean {
  return PART_NOUNS.has(w) || PORTION_HEADS.has(w) || PORTION_HEADS.has(forms(w)[forms(w).length - 1]) || ["pod", "pods", "chunk", "chunks"].includes(w);
}
/**
 * (semantic-v3) A hyphenated compound modifier: its last part is a known modifier, participle or size word ("farm-fresh",
 * "barrel-aged", "platter-size"), or every part but one is a known word of any class — food, modifier, tool, vessel,
 * appliance, unit ("muffin-tin", "foil-packet", "shot-glass", "tin-roof").
 */
function hyphenatedModifier(w: string): boolean {
  const parts = w.split("-").filter((p) => p.length > 0);
  if (parts.length < 2 || !parts.every((p) => /^\p{L}+$/u.test(p))) return false;
  const last = parts[parts.length - 1];
  if (MODIFIER_WORDS.has(last) || knownParticiple(last) || HYPHEN_MEASURE_WORDS.has(last) || ["size", "sized", "style", "fresh", "strength", "grade", "quality", "free", "rich", "ripe", "made"].includes(last)) return true;
  const known = (p: string) => foodModifierWord(p) || EQUIPMENT_TOOL_HEADS.has(p) || VESSEL_LIKE.has(p) || APPLIANCE_WORDS.has(p) || unitOfWord(p) !== null || UNKNOWN_MEASURES.has(p);
  return parts.filter(known).length >= parts.length - 1;
}
/** Joining words before a place name that says where a food comes from ("di Parma", "du Puy", "de Bayonne"). */
const ORIGIN_JOINERS = setOf("di de del della dei da du des d' dal dalla");
/** Heads that are a household product after a brand ("Glad wrap", "Reynolds Wrap"). */
const BRANDED_EQUIPMENT_HEADS = setOf("wrap wraps foil bag bags");

/**
 * Food heads that are also equipment or brand words (round 3): with a count of one and a capitalised word before them they
 * name a product to check, not a food ("1 Big Green Egg", "1 Kamado Joe"); see `homographHeadAfterCapital`.
 */
const HOMOGRAPH_HEADS = setOf("egg eggs joe hanger cracker crackers chip chips wood ring rack ball cup stick boat peel tip straw slice mixer wrap");

/** The name ends in a homograph head (HOMOGRAPH_HEADS) and a capitalised word stands before it. */
export function homographHeadAfterCapital(name: string): boolean {
  const ws = name.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w));
  if (ws.length < 2 || !HOMOGRAPH_HEADS.has(plainWord(ws[ws.length - 1]))) return false;
  return ws.slice(0, -1).some((w) => /^\p{Lu}/u.test(w));
}

// --- semantic-v3 (Phase 2C): classes read from the food lexicons above -------------------------------------------

/** Foods bought by weight or volume rather than counted: herbs, spices, condiments, drinks, grains and flours, pantry and dairy. */
const MASS_CLASS_WORDS: ReadonlySet<string> = setOf(HERBS, SPICES, CONDIMENTS, DRINKS, NUTS_GRAINS, PANTRY, DAIRY, HERBS_MORE, SPICES_MORE, CONDIMENTS_MORE, DRINKS_MORE, NUTS_GRAINS_MORE, PANTRY_MORE, DAIRY_MORE, V3_PANTRY);
/** Foods that are counted as items: produce, meat and fish, breads and baked goods, dishes, sweets. */
const COUNT_CLASS_WORDS: ReadonlySet<string> = setOf(
  FRUITS, VEGETABLES, MUSHROOMS, MEATS, SEAFOOD, BAKED, DISHES, SWEETS, MORE_FOODS, EXTRA_FOODS, FRUITS_MORE, VEGETABLES_MORE, MUSHROOMS_MORE, MEATS_MORE,
  SEAFOOD_MORE, BAKED_MORE, DISHES_MORE, SWEETS_MORE, V3_PRODUCE, V3_CUTS, V3_BAKED,
);
const MEAT_CLASS_WORDS: ReadonlySet<string> = setOf(MEATS, SEAFOOD, MEATS_MORE, SEAFOOD_MORE);
const DRINK_CLASS_WORDS: ReadonlySet<string> = setOf(DRINKS, DRINKS_MORE);

/**
 * (semantic-v3) A food noun that names a substance bought by weight or volume and never a counted item ("saffron",
 * "water", "flour", "mace", "lemongrass"): it is in a mass class (herbs, spices, condiments, drinks, grains and flours,
 * pantry, dairy) and in no counted class. A bare count cannot count such a food by itself.
 */
export function massFoodWord(word: string): boolean {
  const fs = forms(plainWord(word));
  return fs.some((f) => MASS_CLASS_WORDS.has(f)) && !fs.some((f) => COUNT_CLASS_WORDS.has(f));
}
/** (semantic-v3) A food noun in a class bought by weight or volume (it may also be counted: "cheese", "pasta"). */
export function massClassWord(word: string): boolean {
  return forms(plainWord(word)).some((f) => MASS_CLASS_WORDS.has(f));
}
/** (semantic-v3) A meat, poultry, game or fish noun (the heads a cut word such as "blade", "heel" or "crown" may stand before). */
export function meatOrFishWord(word: string): boolean {
  return inSet(MEAT_CLASS_WORDS, plainWord(word));
}
const PRODUCT_HEAD_WORDS: ReadonlySet<string> = setOf(CONDIMENTS, CONDIMENTS_MORE, DRINKS, DRINKS_MORE);
/**
 * (semantic-v3, CONTRACT §12.A A4, §13.4) A processed product named after what it is made from — a sauce, condiment, oil,
 * vinegar, syrup, juice or drink ("lime juice", "maple syrup", "fish sauce"): a name ending in one is a complete food, never
 * a modifier shared before another head.
 */
export function productHeadWord(word: string): boolean {
  return inSet(PRODUCT_HEAD_WORDS, plainWord(word));
}
const INGREDIENT_CLASS_WORDS: ReadonlySet<string> = setOf(
  FRUITS, VEGETABLES, MUSHROOMS, HERBS, SPICES, CONDIMENTS, MEATS, SEAFOOD, DAIRY, DRINKS, NUTS_GRAINS, PANTRY, FRUITS_MORE, VEGETABLES_MORE, MUSHROOMS_MORE,
  HERBS_MORE, SPICES_MORE, CONDIMENTS_MORE, MEATS_MORE, SEAFOOD_MORE, DAIRY_MORE, DRINKS_MORE, NUTS_GRAINS_MORE, PANTRY_MORE, V3_PRODUCE, V3_CUTS, V3_PANTRY,
);
/**
 * (semantic-v3, CONTRACT §13.2) An INGREDIENT noun — produce, meat and fish, dairy, herbs and spices, condiments, drinks,
 * grains and pantry staples: what a food is made of or flavoured with, so it may stand before another food's head
 * ("chicken breast", "cherry tomato", "cheese pizza", "honey glazed ham"). A food noun of no ingredient class names a dish,
 * a sweet or a portion ("bite", "kiss", "wafer", "cake"): before another food it measures it (§13.2).
 */
export function ingredientWord(word: string): boolean {
  return inSet(INGREDIENT_CLASS_WORDS, plainWord(word));
}
/**
 * (semantic-v3) A word that can only describe — an adjective by class (colour, size, taste, texture, form) or by form, or a
 * participle of a known verb ("fresh", "white", "sliced", "whipped", "smoked", "Italian").
 */
export function adjectiveWord(word: string): boolean {
  const w = plainWord(word);
  return knownParticiple(w) || COLOUR_WORDS.has(w) || PRE_NOUN_MODIFIERS.has(w) || /^\p{L}{3,}(?:ian|ican|ese|ish|ic|ful|less|ous|ive|able|ible)$/u.test(w);
}
/** (semantic-v3) A portion or part noun (PORTION_HEADS: "bite", "piece", "chunk", "wedge", "finger"…). */
export function portionWord(word: string): boolean {
  return inSet(PORTION_HEADS, plainWord(word));
}
/** (semantic-v3) A drink noun ("prosecco", "cava", "lager", "rosé"). */
export function drinkWord(word: string): boolean {
  return inSet(DRINK_CLASS_WORDS, plainWord(word));
}
const CLASS_SETS: readonly ReadonlySet<string>[] = [
  setOf(FRUITS, FRUITS_MORE), setOf(VEGETABLES, VEGETABLES_MORE), setOf(MUSHROOMS, MUSHROOMS_MORE), setOf(HERBS, HERBS_MORE), setOf(MEATS, MEATS_MORE),
  setOf(SEAFOOD, SEAFOOD_MORE),
];
/**
 * (semantic-v3, CONTRACT §12.7 b) Two kinds of one food: the option word and the head are in the same produce, mushroom, herb,
 * meat or fish class ("cremini or shiitake mushrooms", "Thai or Genovese basil"): the options share the head.
 */
export function sameKindAs(word: string, head: string): boolean {
  const w = forms(plainWord(word));
  const h = forms(plainWord(head));
  return CLASS_SETS.some((set) => w.some((f) => set.has(f)) && h.some((f) => set.has(f)));
}

const BAKED_CLASS_WORDS: ReadonlySet<string> = setOf(BAKED, BAKED_MORE, SWEETS, SWEETS_MORE, V3_BAKED);
/** (semantic-v3) A baked good or sweet ("cornbread", "cookie", "brownie"): a dish baked in the vessel named before it ("1 skillet cookie"). */
export function bakedWord(word: string): boolean {
  return inSet(BAKED_CLASS_WORDS, plainWord(word));
}

/** (semantic-v3) A vessel or tool that holds an amount (VESSEL_LIKE). */
export function vesselLikeWord(word: string): boolean {
  return VESSEL_LIKE.has(plainWord(word));
}
