/**
 * Illustrative travel package demonstration data.
 * Prices and details are demonstration data as specified in Jira TAMS-7 & TAMS-11.
 */
export const SAMPLE_PACKAGES = [
  {
    id: "pkg-1",
    title: "Coastal Escape",
    destination: "Goa",
    duration: 4,
    durationText: "4 days",
    price: 12999,
    formattedPrice: "₹12,999",
    description: "Relax along sun-drenched golden beaches with sunset cruises, vibrant beach shacks, and rich Indo-Portuguese coastal heritage.",
    imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Scenic sunny beach lined with palm trees in Goa",
    category: "Beach & Leisure",
    itinerary: [
      {
        day: 1,
        title: "Arrival in Goa & Sunset Beach Walk",
        description: "Arrive at Goa International Airport or railway station. Private transfer to your boutique beachfront resort in Candolim. Spend the afternoon settling in and enjoying a relaxing barefoot walk along the golden sand."
      },
      {
        day: 2,
        title: "Old Goa Heritage & Fontainhas Latin Quarter",
        description: "Guided morning exploration of UNESCO World Heritage churches including Basilica of Bom Jesus and Se Cathedral. Afternoon walking tour through the colorful heritage lanes of Fontainhas in Panaji."
      },
      {
        day: 3,
        title: "Arabian Sea Dolphin Cruise & Beach Shacks",
        description: "Embark on an early morning boat cruise along the Arabian Sea to spot playful wild dolphins. Enjoy the afternoon at leisure savoring authentic Goan fish curry and exploring Anjuna and Calangute shacks."
      },
      {
        day: 4,
        title: "Leisure Breakfast & Departure",
        description: "Enjoy a tropical buffet breakfast overlooking lush coastal gardens. Check out and take your private transfer to the airport or railway station for onward travels."
      }
    ],
    inclusions: [
      "3 nights boutique resort accommodation in North Goa",
      "Daily buffet breakfast and welcome cocktail",
      "Private roundtrip airport or railway station transfers",
      "Guided Old Goa & Fontainhas heritage walking tour with certified guide",
      "Morning Arabian Sea dolphin watching boat safari"
    ],
    exclusions: [
      "Flight or train fare to and from Goa",
      "Water sports activities and scuba diving fees",
      "Personal laundry, telephone calls, and room service",
      "Meals and beverages not specified in the inclusions"
    ]
  },
  {
    id: "pkg-2",
    title: "Himalayan Retreat",
    destination: "Manali",
    duration: 5,
    durationText: "5 days",
    price: 18499,
    formattedPrice: "₹18,499",
    description: "Immerse in breathtaking pine valleys, crisp mountain passes, rushing streams, and peaceful alpine trails across Himachal.",
    imageUrl: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Snow-dusted Himalayan mountain peaks and pine trees in Manali",
    category: "Mountains & Adventure",
    itinerary: [
      {
        day: 1,
        title: "Arrival in Manali & Hadimba Temple",
        description: "Arrive at Manali and check in to your mountain-view lodge. Afternoon visit to the historic cedar-wood Hadimba Devi Temple, Vashisht hot springs, and Mall Road evening stroll."
      },
      {
        day: 2,
        title: "Solang Valley Alpine Excursion",
        description: "Full-day excursion to Solang Valley for breathtaking views of snow-dusted Himalayan peaks, ropeway cable car rides, and peaceful nature walks through alpine pine meadows."
      },
      {
        day: 3,
        title: "Atal Tunnel & Sissu Lahaul Valley",
        description: "Scenic mountain drive through the historic Atal Tunnel into the dramatic landscapes of Lahaul Valley. Marvel at the cascading Sissu waterfall and pristine mountain rivers."
      },
      {
        day: 4,
        title: "Naggar Castle & Local Art Galleries",
        description: "Visit the medieval wooden Naggar Castle overlooking the Beas River, explore Nicholas Roerich Art Gallery, and shop for authentic Kullu handwoven shawls."
      },
      {
        day: 5,
        title: "Farewell Manali",
        description: "Savor a warm Himalayan breakfast before checkout and transfer for your return journey."
      }
    ],
    inclusions: [
      "4 nights cedar-view lodge accommodation",
      "Daily breakfast and four-course mountain dinners",
      "Private chauffeur-driven vehicle for all transfers and excursions",
      "All toll taxes, parking fees, and driver allowances"
    ],
    exclusions: [
      "Rohtang Pass special green permit and local union taxi",
      "Adventure sports fees (paragliding, zorbing, rafting)",
      "Travel insurance and personal medical emergencies"
    ]
  },
  {
    id: "pkg-3",
    title: "Royal Heritage",
    destination: "Jaipur",
    duration: 3,
    durationText: "3 days",
    price: 8999,
    formattedPrice: "₹8,999",
    description: "Journey through the Pink City's timeless royal palaces, hilltop Amber Fort, intricate courtyards, and vibrant artisan bazaars.",
    imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Intricate historical architecture of Hawa Mahal palace in Jaipur",
    category: "Culture & Heritage"
    // Intentionally omitting itinerary and inclusions to test graceful handling of missing optional data
  },
  {
    id: "pkg-4",
    title: "Backwater Serenity",
    destination: "Kerala",
    duration: 6,
    durationText: "6 days",
    price: 24999,
    formattedPrice: "₹24,999",
    description: "Drift along tranquil palm-fringed lagoons on a traditional private houseboat while savoring authentic coastal Kerala hospitality.",
    imageUrl: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Traditional wooden houseboat floating on serene Kerala backwaters",
    category: "Nature & Wellness",
    itinerary: [
      {
        day: 1,
        title: "Cochin Arrival & Drive to Munnar Tea Hills",
        description: "Arrive at Cochin Airport. Scenic drive through rubber plantations and misty hills into Munnar. Check in to your tea-estate resort."
      },
      {
        day: 2,
        title: "Munnar Tea Plantations & Eravikulam National Park",
        description: "Visit Eravikulam National Park, home of the endangered Nilgiri Tahr, followed by a guided tour of the historic Mattupetty Tea Museum."
      },
      {
        day: 3,
        title: "Scenic Spice Trails of Thekkady",
        description: "Drive to Thekkady through spice gardens. Afternoon guided spice plantation walk discovering cardamom, pepper, and cinnamon cultivation."
      },
      {
        day: 4,
        title: "Traditional Alleppey Houseboat Cruise",
        description: "Board your private handcrafted houseboat in Alleppey. Cruise serene palm-lined backwaters and watch traditional village life."
      },
      {
        day: 5,
        title: "Kumarakom Bird Sanctuary & Lagoon Sunset",
        description: "Disembark and check in to Kumarakom lakeside resort. Afternoon bird watching and Ayurvedic relaxation overlooking Vembanad Lake."
      },
      {
        day: 6,
        title: "Cochin City Tour & Departure",
        description: "Visit historic Fort Kochi, Chinese fishing nets, and Jewish Synagogue before transfer to Cochin Airport for departure."
      }
    ],
    inclusions: [
      "1 night private Alleppey houseboat with all freshly prepared meals",
      "4 nights premium nature resort stays in Munnar & Kumarakom",
      "Daily breakfast at all land resorts",
      "Private AC vehicle throughout the entire tour",
      "Guided spice plantation walk in Thekkady"
    ],
    exclusions: [
      "National park entry and camera permits",
      "Ayurvedic massage and spa treatments",
      "Airfare and train tickets"
    ]
  },
  {
    id: "pkg-5",
    title: "Valley of Dreams",
    destination: "Kashmir",
    duration: 6,
    durationText: "6 days",
    price: 29999,
    formattedPrice: "₹29,999",
    description: "Experience iconic Shikara rides across Dal Lake, historic terraced Mughal gardens, and snow-kissed alpine meadows of Gulmarg.",
    imageUrl: "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A wooden Shikara boat on the calm waters of Dal Lake in Kashmir",
    category: "Scenic Escapes",
    itinerary: [
      {
        day: 1,
        title: "Srinagar Arrival & Dal Lake Shikara Sunset",
        description: "Arrive at Srinagar Airport. Transfer to your luxury carved cedar houseboat on Dal Lake. Enjoy a sunset Shikara ride across the floating markets."
      },
      {
        day: 2,
        title: "Gulmarg Meadow of Flowers & Gondola Ride",
        description: "Full-day excursion to Gulmarg. Take the world-famous Gondola cable car up to Apharwat Peak for breathtaking panoramic Himalayan vistas."
      },
      {
        day: 3,
        title: "Pahalgam Valley of Shepherds & Betaab Valley",
        description: "Scenic drive along Lidder River to Pahalgam. Explore picturesque Betaab Valley, Aru Valley meadows, and historic pine trails."
      },
      {
        day: 4,
        title: "Sonamarg Meadow of Gold & Thajiwas Glacier",
        description: "Day excursion to Sonamarg, gateway to Ladakh. Marvel at the glistening Thajiwas Glacier and rugged snow-capped peaks."
      },
      {
        day: 5,
        title: "Historic Mughal Gardens & Old Srinagar Heritage",
        description: "Tour the terraced Mughal gardens of Nishat and Shalimar Bagh. Explore Jamia Masjid and artisan paper-mâché craft workshops in Old Srinagar."
      },
      {
        day: 6,
        title: "Farewell Kashmir",
        description: "Enjoy morning Kahwa tea on the deck before private transfer to Srinagar Airport for your onward journey."
      }
    ],
    inclusions: [
      "1 night deluxe Dal Lake houseboat experience",
      "4 nights boutique hotel stay in Srinagar",
      "Daily breakfast and authentic Wazwan-inspired dinners",
      "1-hour private sunset Shikara ride on Dal Lake",
      "Private vehicle for all airport transfers and day excursions"
    ],
    exclusions: [
      "Gulmarg Gondola cable car ride tickets",
      "Pony or horse riding charges in Pahalgam/Sonamarg",
      "Personal tips, laundry, and beverage expenses"
    ]
  },
  {
    id: "pkg-6",
    title: "Island Discovery",
    destination: "Andaman",
    duration: 5,
    durationText: "5 days",
    price: 26499,
    formattedPrice: "₹26,499",
    description: "Discover crystal-clear turquoise waters, vibrant coral reefs, and pristine white-sand shores across Havelock and Neil islands.",
    imageUrl: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Turquoise tropical ocean waters and white sandy beach in Andaman",
    category: "Islands & Diving",
    itinerary: [
      {
        day: 1,
        title: "Port Blair Arrival & Cellular Jail Light Show",
        description: "Arrive at Veer Savarkar International Airport, Port Blair. Check in to your hotel. Evening visit to national memorial Cellular Jail and poignant Light & Sound show."
      },
      {
        day: 2,
        title: "Catamaran Cruise to Havelock & Radhanagar Beach",
        description: "Board high-speed luxury catamaran to Havelock Island (Swaraj Dweep). Afternoon at Asia's renowned Radhanagar Beach for spectacular sunset views."
      },
      {
        day: 3,
        title: "Elephant Beach Coral Reef Exploration",
        description: "Boat ride to Elephant Beach for snorkeling amidst vibrant coral reefs, colorful marine life, and tranquil shallow turquoise waters."
      },
      {
        day: 4,
        title: "Neil Island Natural Rock Bridge & Sunset Point",
        description: "Ferry to Neil Island (Shaheed Dweep). Visit the famous natural rock formation bridge and relaxed sands of Bharatpur and Laxmanpur beaches."
      },
      {
        day: 5,
        title: "Return Ferry to Port Blair & Departure",
        description: "Morning ferry back to Port Blair. Transfer to the airport with cherished island memories."
      }
    ],
    inclusions: [
      "4 nights premium beachfront island resort stays",
      "Daily buffet breakfast at all resorts",
      "Inter-island catamaran tickets (Makruzz or Nautika)",
      "Complimentary guided snorkeling session at Elephant Beach",
      "All port transfers and Cellular Jail entry tickets"
    ],
    exclusions: [
      "Scuba diving, underwater sea walk, and jet ski rentals",
      "Airfare to and from Port Blair (IXZ)",
      "Camera and video permits at monuments"
    ]
  }
];
