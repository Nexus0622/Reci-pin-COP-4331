import React, { useState } from 'react';
import {TouchableOpacity, ScrollView, Image, Modal, StyleSheet} from 'react-native';
import {SafeAreaView, Text, View} from 'react-native-picasso';
import SearchBar from '../../components/SearchBar';
import RecipeCard from '../../components/RecipeCard';
import URL from '../../components/URL';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

const url = URL()


export default function AllRecipes({route, navigation})
{
    var all = route.params.allRecipes
    var likes = route.params.liked
    var favs = route.params.favs
    const [searchArray, setSearchArray] = useState(route.params.allRecipes)
    const [clickedLike, setClickedLike] = useState(false)
    const [clickedFav, setClickedFav] = useState(false)
    likeMap = {}
    favMap = {}
    updateLikeAndFavMaps()
    function updateLikeAndFavMaps()
    {
        likes.forEach((rec) => {
            likeMap[rec._id] = rec
        })
        favs.forEach((rec) => {
            favMap[rec._id] = rec
        })
    }
    React.useEffect(() => {
        const nameHeader = navigation.addListener('focus', () => {
            navigation.getParent().setOptions({
                title: "All Recipes"
              });
        });
    
        return nameHeader;
      }, [navigation]);

      async function search(text)
      {
        let filteredArray = []
        try
        {    
            let response = await fetch(url + 'searchRecipe',  {method:'POST', body:JSON.stringify({searchTerm:text}), 
            headers:{'Content-Type': 'application/json', "x-access-token":route.params.token}});
            let txt = await response.text();
            console.warn(txt)
            let recipes = JSON.parse(txt);
            if(clickedLike)
            {
                recipes.forEach((rec) => {
                    if (rec._id in likeMap)
                    {
                        filteredArray.push(rec)
                    }
                })
            }
            if(clickedFav)
            {
                recipes.forEach((rec) => {
                    if (rec._id in favMap)
                    {
                        filteredArray.push(rec)
                    }
                })
            }
            else
            {
                filteredArray = recipes;
            }
            setSearchArray(filteredArray)
            }
            catch(error)
            {
                console.warn(error.toString())
            }

        }

    async function filterLike()
    {
        if (clickedLike)
        {
            setSearchArray(all)
        }
        else
        {
            if (clickedFav)
            {
                setClickedFav(false)
            }
            try
            {
                let response = await (fetch(url + "getLikes", {method:"POST", 
                                        body: JSON.stringify({userID: route.params.id}), 
                                        headers:{'Content-Type': 'application/json', 'x-access-token': route.params.token}}))
                let txt = await response.text()
                let res = JSON.parse(txt)
                let filteredArray = []
                res.forEach((rec) => {
                    filteredArray.push(rec)
                })

                setSearchArray(filteredArray)
            
            }
            catch(error)
            {
                console.warn(error.toString())
            }
        }
        setClickedLike(!clickedLike)
    }

        async function filterFav()
        {
            if (clickedFav)
            {
               setSearchArray(all)
            }
            else
            {
                try
                {
                    if (clickedLike)
                    {
                        setClickedLike(false)
                    }
                    let response = await (fetch(url + "getFavorites", {method:"POST", 
                                            body: JSON.stringify({userID: route.params.id}), 
                                            headers:{'Content-Type': 'application/json', 'x-access-token': route.params.token}}))
                    let txt = await response.text()
                    let res = JSON.parse(txt)
                    let filteredArray = []
                    res.forEach((rec) => {
                        filteredArray.push(rec)
                    })

                    setSearchArray(filteredArray)
                
                }
                catch(error)
                {
                    console.warn(error.toString())
                }
            }
            setClickedFav(!clickedFav)
        }

      return (
        <SafeAreaView>
            <View style={{position:"absolute", marginTop:"176%", backgroundColor:'#addfad', height:"10%", width:"100%", zIndex:15 , borderWidth:2, flexDirection:"row"}}>
                <View style={{marginTop:"2.5%", marginLeft:"10%"}}>
                    <TouchableOpacity onPress={() => filterLike()}>
                        <FontAwesome name= {clickedLike ? "thumbs-up" :"thumbs-o-up"} size={50} color="white" />
                    </TouchableOpacity>
                </View>
                <View>
                    <TouchableOpacity style={{marginLeft:"70%", marginTop:"3%"}} onPress={() => filterFav()}>
                        <Ionicons name={ clickedFav ? "heart-circle":"heart-circle-outline"} size={50} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView style={{width:"100%", height:"100%"}}>
                <SearchBar onChangeText={search} placeholder="Search"
                           />
                    <View>
                            {searchArray.map((rec) => {
                                return (
                                    <RecipeCard name={rec.name}
                                                desc={rec.desc}
                                                country={rec.country}
                                                pic={rec.pic}
                                                ingredients={rec.ingredients}
                                                instructions={rec.instructions}
                                                userID={route.params.id}
                                                recID={rec._id}
                                                creID={rec.creator}
                                                token={route.params.token}
                                                faved={(rec._id in favMap)}
                                                liked={(rec._id in likeMap)}
                                                updateMaps={updateLikeAndFavMaps}
                                                key={rec._id}
                                    />
                                )
                            })}
                    </View>
            </ScrollView>
        </SafeAreaView>
    )

}