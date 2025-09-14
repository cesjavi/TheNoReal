import SplashScreen from './components/SplashScreen';

export default function Loading() {
  const handleOnFinish = () => {
    console.log('Loading finished');
  };
  return <SplashScreen onFinish={handleOnFinish} />;
}

