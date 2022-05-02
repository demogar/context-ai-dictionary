import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import * as cocossd from "@tensorflow-models/coco-ssd";
import * as jpeg from "jpeg-js";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from 'expo-file-system';
import translate from "translate-google-api";
import { Text, View } from "../components/Themed";

export default function TabOneScree() {
  const [isTfReady, setIsTfReady] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [imageToAnalyze, setImageToAnalyze] = useState(null);
  const model = useRef(null);

  useEffect(() => {
    const initializeTensorFlowAsync = async () => {
      await tf.setBackend('cpu');
      await tf.ready();
      setIsTfReady(true);
    };

    const initializeCocoModelAsync = async () => {
      model.current = await cocossd.load();
      setIsModelReady(true);
    };

    const getCameraPermissionsAsync = async () => {
      const {
        status:cameraPermissions,
      } = await ImagePicker.requestCameraPermissionsAsync();

      const {
        status:mediaPermission,
      } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraPermissions !== "granted" || mediaPermission !== "granted") {
        Alert.alert("Sorry, we need camera permissions to make this work!");
      }
    };

    initializeTensorFlowAsync();
    initializeCocoModelAsync();
    getCameraPermissionsAsync();
  }, []);

  const imageToTensor = (rawImageData) => {
    const { width, height, data } = jpeg.decode(rawImageData, {
      useTArray: true,
    });

    const buffer = new Uint8Array(width * height * 3);
    let offset = 0; // offset into original data
    for (let i = 0; i < buffer.length; i += 3) {
      buffer[i] = data[offset];
      buffer[i + 1] = data[offset + 1];
      buffer[i + 2] = data[offset + 2];

      offset += 4;
    }

    return tf.tensor3d(buffer, [height, width, 3]);
  };

  const detectObjectsAsync = async (source) => {
    try {
      const imgB64 = await FileSystem.readAsStringAsync(source.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
      const rawImageData = new Uint8Array(imgBuffer)
      const imageTensor = imageToTensor(rawImageData);
      const newPredictions = await model.current.detect(imageTensor);

      // Create tanslations
      const translations = await translate(newPredictions.map(prediction => prediction.class), {
        tld: "cn",
        to: "it",
      });
      newPredictions.forEach((element, index) => {
        element.translation = translations[index];
      });
      setPredictions(newPredictions);
      console.log("Detected objects:");
      console.log("-----------------")
      console.log(newPredictions);
    } catch (error) {
      console.log("Error: ", error);
    }
  };

  const selectImageAsync = async () => {
    try {
      let response = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (!response.cancelled) {
        // resize image to avoid out of memory crashes
        const manipResponse = await ImageManipulator.manipulateAsync(
          response.uri,
          [{ resize: { width: 900 } }],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );

        const source = { uri: manipResponse.uri };
        setImageToAnalyze(source);
        setPredictions(null);
        await detectObjectsAsync(source);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const borderColors = ["blue", "green", "orange", "pink", "purple"];
  const scalingFactor = 280 / 900; // image display size / actual image size

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.welcomeContainer}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingTfContainer}>
              <Text style={styles.text}>TensorFlow.js: </Text>
              {isTfReady ? (
                <Text style={styles.text}>✅</Text>
              ) : (
                <ActivityIndicator size="small" color="#ffffff" />
              )}
            </View>

            <View style={styles.loadingModelContainer}>
              <Text style={styles.text}>Model (COCO-SSD): </Text>
              {isModelReady ? (
                <Text style={styles.text}>✅</Text>
              ) : (
                <ActivityIndicator size="small" color="#ffffff" />
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.imageWrapper}
            onPress={isModelReady ? selectImageAsync : undefined}
          >
            {imageToAnalyze && (
              <View style={{ position: "relative" }}>
                {isModelReady &&
                  predictions &&
                  Array.isArray(predictions) &&
                  predictions.length > 0 &&
                  predictions.map((p, index) => {
                    return (
                      <View
                        key={index}
                        style={{
                          zIndex: 1,
                          elevation: 1,
                          left: p.bbox[0] * scalingFactor,
                          top: p.bbox[1] * scalingFactor,
                          width: p.bbox[2] * scalingFactor,
                          height: p.bbox[3] * scalingFactor,
                          borderWidth: 2,
                          borderColor: borderColors[index % 5],
                          backgroundColor: "transparent",
                          position: "absolute",
                        }}
                      />
                    );
                  })}

                <View
                  style={{
                    zIndex: 0,
                    elevation: 0,
                  }}
                >
                  <Image
                    source={imageToAnalyze}
                    style={styles.imageContainer}
                  />
                </View>
              </View>
            )}

            {!isModelReady && !imageToAnalyze && (
              <Text style={styles.transparentText}>Loading model ...</Text>
            )}

            {isModelReady && !imageToAnalyze && (
              <Text style={styles.transparentText}>Tap here to slect or take a picture</Text>
            )}
          </TouchableOpacity>
          <View style={styles.predictionWrapper}>
            {isModelReady && imageToAnalyze && (
              <Text style={styles.text}>
                {predictions ? "" : "Please wait..."}
              </Text>
            )}
            {isModelReady &&
              predictions &&
              predictions.map((p, index) => {
                return (
                  <View key={index}>
                    <Text style={[styles.text, styles.translation]}>
                      {`${p.class} (${(p.score * 100).toFixed(2)}%)`}
                    </Text>
                    <Text style={[styles.text, styles.italian]}>
                      {`— 🇮🇹 ${p.translation}`}
                    </Text>
                  </View>
                );
              })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  contentContainer: {
    paddingTop: 5,
  },
  headerText: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "bold",
  },
  instructionsContainer: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 5,
  },
  instructionsText: {
    fontSize: 16,
  },
  loadingContainer: {
    marginTop: 5,
    width: "100%",
    paddingLeft: 20,
    paddingRight: 20,
  },
  text: {
    fontSize: 16,
  },
  loadingTfContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  loadingModelContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  imageWrapper: {
    width: 320,
    height: 320,
    borderColor: "#66c8cf",
    borderWidth: 3,
    borderStyle: "dashed",
    marginTop: 40,
    marginBottom: 0,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: 300,
    height: 300,
  },
  predictionWrapper: {
    width: "100%",
    flexDirection: "column",
    alignItems: "flex-start",
    paddingLeft: 20,
    paddingRight: 20,
  },
  transparentText: {
    opacity: 0.8,
  },
  translation: {
    marginTop: 7,
  },
  italian: {
    fontStyle: 'italic',
  },
});
