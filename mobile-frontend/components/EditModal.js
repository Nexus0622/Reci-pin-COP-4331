import React, { useState, Component } from "react";
import { ScrollView, StyleSheet, KeyboardAvoidingView, TextInput, View, Image, Text, ImageBackground, Dimensions} from "react-native";
import { Feather } from '@expo/vector-icons';
import { TouchableOpacity } from "react-native-picasso";
import URL from './URL';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

const url = URL();
export default function EditModal({name, desc, country, ingredients, instructions, recID, token, onXClick})
{
    const [textRecName, setTextRecName] = useState(name)
    const [textCountryName, setTextCountryName] = useState(country)
    const [textDesc, setTextDesc] = useState(desc)
    const [textIngredients, setTextIngredients] = useState(ingredients)
    const [textInst, setTextInst] = useState(instructions)

    async function fireEditData()
    {
        let arr = [textRecName, textIngredients, textInst, textDesc]
        let ops = ["name", "ingredients", "instructions", "desc"]
        for (var i = 0; i < arr.length; i++)
        {
            try
            {
                let resp = await fetch(url + "editRecipe", {method:"POST", 
                                        body: JSON.stringify({recipeID: recID, newField: ops[i], newValue: arr[i]}), 
                                        headers:{'Content-Type': 'application/json', 
                                        'x-access-token': token}})
                let txt = await resp.text();
                let badabingbadaboom = JSON.parse(txt)
                if (badabingbadaboom.error != "")
                {
                    console.warn("Something went terribly terribly wrong")
                }
            }
            catch(e)
            {
                console.warn(e.toString())
            }
        }
        onXClick()
    }
    return (
        <View style={styles.main}>
            <ImageBackground
                source={{uri: 'https://cdn.discordapp.com/attachments/963149385875738684/965435683554598982/keylime.jpg'}}
                style={styles.img}
            >
                <TouchableOpacity onPress={onXClick} activeOpacity={0.25} borderColor='black' borderWidth="2">
                    <Feather style={{marginLeft:"2%", marginTop:"2%"}} name="x" size={28} color="black"/>
                </TouchableOpacity>
            </ImageBackground>
            <KeyboardAwareScrollView style={styles.scroll}>
                <Text style={styles.sectionTitles}>
                    Recipe Name:
                </Text>
                <TextInput placeholderTextColor="black" placeholder='Enter recipe name' 
                            value={textRecName} onChangeText={setTextRecName} 
                            style={styles.txtInput}/>
                <Text style={styles.sectionTitles}>
                    Country:
                </Text>
                <TextInput placeholderTextColor="black" placeholder='Enter country name' 
                            value={textCountryName} onChangeText={setTextCountryName} 
                            style={styles.readOnly} editable={false}/>
                <Text style={styles.sectionTitles}>
                    Ingredients:
                </Text>
                <TextInput placeholderTextColor="black" placeholder='Enter ingredients' 
                            value={textIngredients} onChangeText={setTextIngredients} 
                            style={styles.txtInput} multiline={true} scrollEnabled={false}/>
                <Text style={styles.sectionTitles}>
                    Description:
                </Text>
                <TextInput placeholderTextColor="black" placeholder='Enter description' 
                            value={textDesc} onChangeText={setTextDesc} 
                            style={styles.txtInput} multiline={true} scrollEnabled={false}/>
                <Text style={styles.sectionTitles}>
                    Steps:
                </Text>
                <TextInput placeholderTextColor="black" placeholder='Enter instructions' 
                            value={textInst} onChangeText={setTextInst} 
                            style={styles.txtInput} multiline={true} scrollEnabled={false}/>
                <TouchableOpacity
                    activeOpacity={0.5} onPress={() => fireEditData()}
                    style={{width: "60%", padding:"3%", backgroundColor: "green", borderRadius: 10, shadowOpacity: ".2",
                            alignSelf: "center", marginTop:"3%"}} >
                    <Text style={{textAlign: "center", fontSize: 20, color:"white", fontFamily: "Arial", fontWeight: "500"}}>
                        Submit Changes
                    </Text>
                </TouchableOpacity>
            </KeyboardAwareScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    main: {
        borderColor:'black',
        borderWidth:2,
        marginTop:"25%",
        height:"78%",
        width:"95%",
        margin:20,
        backgroundColor:"white",
        padding:15,
        alignItems:'center',
        alignSelf:'center'
    },
    scroll: {
        width:"100%",
        height:"100%",
        marginTop:"3%"
    },
    img: {
        alignSelf:'center',
        width:407,
        height:200,
        marginTop:"-5%",
        borderRadius:40
    },
    mainTitle: {
        fontSize: 30,
        fontWeight:"800"
    },
    countryName: {
        fontSize:15,
        fontStyle:'italic'
    },
    sectionTitles: {
        marginTop:"7%",
        fontSize:20,
        fontWeight:"600",
    },
    bodyText: {
        fontSize:14
    },
    footer: {
        flexDirection:'row',
        alignItems:'center',
        marginBottom:"-4%",
        backgroundColor: "#e6e6e6",
        width: "109%",
        height: "8%"
    },
    txtInput: {
        padding:"5%", 
        borderColor:"black", 
        borderWidth:2,
        borderRadius:20,
        maxHeight: "13%"
    },
    readOnly: {
        backgroundColor: "#c0c0c0",
        padding:"5%", 
        borderColor:"black", 
        borderWidth:2,
        borderRadius:20
    }
})