import React, {useState} from 'react';
import {TouchableOpacity, ScrollView, Image, Modal, StyleSheet} from 'react-native';
import {SafeAreaView, Text, View} from 'react-native-picasso';
import SearchBar from '../../components/SearchBar';
import URL from '../../components/URL';
import RecipeCard from '../../components/RecipeCard'
const url = URL()

export default function LikedRecipes({route, navigation})
{
    var likes = route.params.liked
    var favs = route.params.favs
    const hashyHash = {}
    const[searchArray, setSearchArray] = useState(route.params.liked)
    React.useEffect(() => {
        const nameHeader = navigation.addListener('focus', () => {
            navigation.getParent().setOptions({
                title: "Liked"
              });
        });
    
        return nameHeader;
      }, [navigation]);

      favMap = {}
      favs.forEach((rec) => {
          favMap[rec._id] = rec
      })

      async function search(text)
      {
        try
        {
                likes.forEach((rec) => {
                    hashyHash[rec._id] = rec
                })
                

            let response = await fetch(url + 'searchRecipe',  {method:'POST', body:JSON.stringify({searchTerm:text}), 
            headers:{'Content-Type': 'application/json', "x-access-token":route.params.token}});
            let txt = await response.text();

            let recipes = JSON.parse(txt);
            let tempArray = []


            recipes.forEach((rec) => {
                ("This is working")
                    if (rec._id in hashyHash)
                    {
                        tempArray.push(rec)
                    }
            })

            setSearchArray(tempArray)
        }
        catch(error)
        {
            console.warn(error.toString())
        }


    }

      return (
        <SafeAreaView>
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
                                token={route.params.token}
                                faved={(rec._id in favMap)}
                                liked={true}
                                key={rec._id}
                            />
                        )
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}